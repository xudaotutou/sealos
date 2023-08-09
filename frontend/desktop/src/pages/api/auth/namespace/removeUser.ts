import { authSession } from '@/services/backend/auth';
import { UserRole, checkCanManage, queryNS } from '@/services/backend/db/namespace';
import { UserNsStatus, queryUserByk8sUser } from '@/services/backend/db/user';
import { jsonRes } from '@/services/backend/response';
import { modifyTeamRole, unbindingRole } from '@/services/backend/team';
import { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    //
    const { nsid, targetUsername, role } = req.body as {
      nsid?: string;
      targetUsername?: string;
      role?: UserRole;
    };
    const k8s_username = payload.user.k8s_username;

    if (!nsid) return jsonRes(res, { code: 400, message: 'nsid is required' });
    if (!targetUsername) return jsonRes(res, { code: 400, message: 'targetUsername is required' });
    if (role === undefined) return jsonRes(res, { code: 400, message: 'role is required' });
    if (!checkCanManage({ namespace: nsid, k8s_username, role }))
      return jsonRes(res, { code: 403, message: 'you are not manager' });

    const target_ns = await queryNS({ namespace: nsid });
    if (!target_ns) return jsonRes(res, { code: 404, message: 'fail to get ns' });

    // 邀请状态这层,
    const userItem = await queryUserByk8sUser(targetUsername);
    if (!userItem) return Promise.reject('fail to modify role');
    const targetUser = userItem.k8s_users?.[0];
    if (!targetUser) return Promise.reject('fail to modify role');
    const userNS = targetUser.namespaces?.find((item) => item.id === nsid);
    if (!userNS) return Promise.reject('fail to modify role');
    if (userNS.role !== role) return jsonRes(res, { code: 404, message: 'fail to modify role' });
    let unbinding_result = null;
    if (UserNsStatus.Inviting === userNS.status) {
      // 等于取消邀请
      unbinding_result = await unbindingRole({ k8s_username: targetUsername, nsid });
    } else if (UserNsStatus.Accepted === userNS.status) {
      // 删除权限
      const modify_result = await modifyTeamRole({
        k8s_username: targetUsername,
        role,
        action: 'Deprive',
        ns: target_ns,
        user
      });
      if (!modify_result)
        return jsonRes(res, { code: 404, message: 'fail to remove team memeber role' });
      unbinding_result = await unbindingRole({ k8s_username: targetUsername, nsid });
    }
    if (!unbinding_result)
      return jsonRes(res, { code: 404, message: 'fail to remove team memeber role' });
    jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: {
        user: unbinding_result.ns_result.users,
        namespaces: unbinding_result.user_result.k8s_users?.[0].namespaces || []
      }
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'fail to remove team member' });
  }
}
