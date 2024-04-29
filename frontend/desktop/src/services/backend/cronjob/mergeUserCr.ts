import { globalPrisma, prisma } from '../db/init';
import { $Enums, TransactionStatus, TransactionType } from 'prisma/global/generated/client';
import { JoinStatus } from 'prisma/region/generated/client';
import { getBillingUrl, getCvmUrl, getWorkorderUrl } from '@/services/enable';
import { CronJobStatus } from '@/services/backend/cronjob/index';
import { getUserKubeconfigNotPatch } from '@/services/backend/kubernetes/admin';
import { mergeUserModifyBinding, mergeUserWorkspaceRole } from '@/services/backend/team';
import axios from 'axios';
import { generateCronJobToken } from '../auth';

/**
 * |											|	user is exist | user is not exist 			|
 * |mergeUser is exist 		|	merge					|	update mereUser to user	|
 * |mergeUser is not exist| return ok			|			return ok						|
 */
export class MergeUserCrJob implements CronJobStatus {
  private mergeUserUid = '';
  private userUid: string = '';
  UNIT_TIMEOUT = 30000;
  COMMIT_TIMEOUT = 60000;
  transactionType = TransactionType.MERGE_USER;
  constructor(private transactionUid: string, private infoUid: string) {}
  async init() {
    const info = await globalPrisma.mergeUserTransactionInfo.findUnique({
      where: {
        uid: this.infoUid
      }
    });
    if (!info) throw new Error('the transaction info not found');
    const { mergeUserUid, userUid } = info;
    this.mergeUserUid = mergeUserUid;
    this.userUid = userUid;
  }
  async unit() {
    await this.init();
    const mergeUserUid = this.mergeUserUid;
    const userUid = this.userUid;
    const mergeUserCr = await prisma.userCr.findUnique({
      where: { userUid: mergeUserUid }
    });

    if (!mergeUserCr) {
      // the mergeUser is not exist in the current region
      return;
      // throw new Error('the mergeUserCR is not found');
    }
    const userCr = await prisma.userCr.findUnique({
      where: { userUid }
    });
    if (!userCr) {
      // the user is not exist in the current region
      // throw new Error('the userCR is not found');
      await prisma.userCr.update({
        where: {
          userUid: mergeUserUid
        },
        data: {
          userUid
        }
      });
    } else {
      const [userWorkspaceList, mergeUserWorkspaceList] = await prisma.$transaction([
        prisma.userWorkspace.findMany({
          where: {
            userCrUid: userCr.uid,
            status: JoinStatus.IN_WORKSPACE
          }
        }),
        prisma.userWorkspace.findMany({
          where: {
            userCrUid: mergeUserCr.uid,
            status: JoinStatus.IN_WORKSPACE
          },
          include: {
            workspace: {
              select: {
                id: true
              }
            }
          }
        })
      ]);
      // modify role
      await Promise.all(
        mergeUserWorkspaceList.map(async ({ role, workspaceUid, workspace }) => {
          const userWorkspace = userWorkspaceList.find((r) => r.workspaceUid === workspaceUid);
          // modify k8s resource, the handle is idempotent
          await mergeUserWorkspaceRole({
            mergeUserRole: role,
            userRole: userWorkspace?.role,
            workspaceId: workspace.id,
            mergeUserCrName: mergeUserCr.crName,
            userCrName: userCr.crName
          });
          // modify db resource
          await mergeUserModifyBinding({
            mergeUserCrUid: mergeUserCr.uid,
            mergeUserRole: role,
            userCrUid: userCr.uid,
            workspaceUid
          });
        })
      );
    }
  }
  canCommit() {
    const baseBillingUrl = getBillingUrl();
    const baseWorkorderUrl = getWorkorderUrl();
    const baseCvmUrl = getCvmUrl();
    return !!baseBillingUrl && !!baseCvmUrl && !!baseWorkorderUrl;
  }
  async commit() {
    await this.init();
    const mergeUserUid = this.mergeUserUid;
    const userUid = this.userUid;
    if (!mergeUserUid || !userUid) throw Error('uid not found');
    const baseBillingUrl = getBillingUrl();
    const baseWorkorderUrl = getWorkorderUrl();
    const baseCvmUrl = getCvmUrl();
    const billingUrl = baseBillingUrl + '/account/v1alpha1/transfer';
    const workorderUrl = baseWorkorderUrl + '/api/v1/migrate';
    const cvmUrl = baseCvmUrl + '/action/sealos-account-merge';
    // transfer
    const [user, mergeUser] = await globalPrisma.$transaction([
      globalPrisma.user.findUniqueOrThrow({ where: { uid: userUid } }),
      globalPrisma.user.findUniqueOrThrow({ where: { uid: mergeUserUid } })
    ]);
    let finalUserCr = await prisma.userCr.findUnique({
      where: {
        userUid: mergeUser.uid
      }
    });
    if (!finalUserCr) {
      finalUserCr = await prisma.userCr.findUnique({
        where: {
          userUid
        }
      });
      if (!finalUserCr) {
        throw Error('the userCr is not exist');
      }
    }
    const kubeConfig = await getUserKubeconfigNotPatch(finalUserCr.crName);
    if (!kubeConfig) throw Error('the kubeconfig for ' + finalUserCr.crName + ' is not found');
    const [transferResult, workorderResult, cvmResult] = await Promise.all([
      axios.post(billingUrl, {
        kubeConfig,
        owner: finalUserCr.crName,
        userid: mergeUser.id,
        toUser: user.id,
        transferAll: true
      }),
      axios.post(workorderUrl, {
        token: generateCronJobToken({
          userUid: user.id,
          mergeUserUid: mergeUser.id
        })
      }),
      axios.post(cvmUrl, {
        token: generateCronJobToken({
          userUid: user.uid,
          mergeUserUid: mergeUser.uid
        })
      })
    ]);
    if (
      !transferResult ||
      transferResult.status !== 200 ||
      !workorderResult ||
      workorderResult.status !== 200 ||
      workorderResult.data.code !== 200 ||
      !cvmResult ||
      cvmResult.status !== 200 ||
      cvmResult.data.data !== 'ok'
    ) {
      throw new Error('commit Error');
    }
    await globalPrisma.$transaction([
      globalPrisma.commitTransactionSet.create({
        data: {
          precommitTransactionUid: this.transactionUid
        }
      }),
      globalPrisma.deleteUserLog.create({
        data: {
          userUid: mergeUserUid
        }
      }),
      globalPrisma.precommitTransaction.findUniqueOrThrow({
        where: {
          uid: this.transactionUid,
          status: TransactionStatus.FINISH
        }
      }),
      globalPrisma.precommitTransaction.update({
        where: {
          uid: this.transactionUid,
          status: TransactionStatus.FINISH
        },
        data: {
          status: TransactionStatus.COMMITED
        }
      })
    ]);
  }
}
