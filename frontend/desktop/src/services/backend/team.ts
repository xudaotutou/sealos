import { RoleType, RoleAction, generateRequestCrd, ROLE_LIST } from '@/types/team';
import { KubernetesObject } from '@kubernetes/client-node';
import { Namespace, addNSUser, checkCanManage, createNS, queryNS } from './db/namespace';
import { User, addUserNS, queryUserByk8sUser } from './db/user';
import { NSType, removeNSUser, UserRole } from './db/namespace';
import { updateUserNS, UserNsStatus, removeUserNs } from './db/user';
import { K8sApiDefault } from './kubernetes/admin';
import { ApplyYaml } from './kubernetes/user';

// 只修改，不包含邀请的业务逻辑，应该是确保数据库已经有记录,只修改记录，并且修改k8s的rolebinding
export const modifyTeamRole = async (props: {
  k8s_username: string;
  role: UserRole;
  action: RoleAction;
  user: User;
  ns: Namespace;
}) => {
  const k8s_username = props.k8s_username;
  const nsinfo = props.ns;
  if (nsinfo.nstype === NSType.Private) return Promise.reject('fail to modify private role');
  const kc = K8sApiDefault();
  const nsUser = nsinfo?.users.find((item) => item.username === k8s_username);

  const applyRoleRequest = async (
    role: UserRole,
    Action: Exclude<RoleAction, 'Change'>,
    Username = k8s_username
  ) =>
    await ApplyYaml(
      kc,
      generateRequestCrd({
        Username,
        Namespace: nsinfo.id,
        Action,
        Type: ROLE_LIST[role]
      })
    );
  let result: KubernetesObject[] = [];
  if (props.action === 'Grant') {
    result = await applyRoleRequest(props.role, 'Grant');
    if (!result || result.length === 0) return null;
  } else if (props.action === 'Deprive') {
    // 减权限 =》踢人
    if (!nsUser) return null;
    const old_role = nsUser.role;
    // 保证存在
    if (old_role !== props.role) return null;
    result = await applyRoleRequest(props.role, props.action);
    if (!result || result.length === 0) return null;
  } else if (props.action === 'Change') {
    if (props.role === UserRole.Owner) {
      // 先把自己的权限去掉
      const oldOwner = nsinfo?.users.find((item) => item.role === UserRole.Owner);
      if (!oldOwner) return null;
      result = await applyRoleRequest(UserRole.Owner, 'Deprive', oldOwner.username);
      // 再补充新的权限上来
      result = await applyRoleRequest(UserRole.Developer, 'Grant');
      // // 修改数据库, 先绑定，后解绑，因为绑定的时候会检查发起绑定的人是否是manger
    } else {
      return null;
    }
  }
  if (!result || result.length === 0) return null;
  return Promise.resolve(result);
};
// ==================================
// 以下是邀请的业务逻辑,只负责改数据库
// 邀请要把 user 预先加到 ns/user 表，待确认以后再 修改 user表->更新rolebinding, (direct=true 直接绑定),不需要确认
export const bindingRole = async (props: {
  k8s_username: string;
  nsid: string;
  role: UserRole;
  direct?: boolean;
}) => {
  // add user ns
  // const isManager = await checkCanManage({ namespace: props.nsid, k8s_username: props.host_username, role: props.role })
  // if (!isManager) return Promise.reject('you are not manager')
  const user = await queryUserByk8sUser(props.k8s_username);
  if (!user) return null;

  const user_result = await addUserNS({
    id: user.uid,
    k8s_username: props.k8s_username,
    provider: 'uid',
    namespace: {
      id: props.nsid,
      status: !!props.direct ? UserNsStatus.Accepted : UserNsStatus.Inviting,
      nstype: NSType.Team,
      role: props.role
    }
  });
  if (!user_result) return null;
  // add ns user
  // ns 不一定有
  const namespace = await queryNS({ namespace: props.nsid });
  let ns_result = null;
  if (!namespace) {
    ns_result = await createNS({
      namespace: props.nsid,
      k8s_username: props.k8s_username,
      nstype: NSType.Team
    });
  } else {
    ns_result = await addNSUser({
      namespace: props.nsid,
      user: {
        username: props.k8s_username,
        role: props.role
      }
    });
  }
  return ns_result;
};
// 拒绝邀请 === 解绑
export const unbindingRole = async (props: { k8s_username: string; nsid: string }) => {
  const user = await queryUserByk8sUser(props.k8s_username);
  if (!user) return null;
  const user_result = await removeUserNs({
    id: user.uid,
    provider: 'uid',
    namespace: props.nsid,
    k8s_username: props.k8s_username
  });
  if (!user_result) return null;
  const ns_result = await removeNSUser({
    namespace: props.nsid,
    username: props.k8s_username
  });
  if (!ns_result) return null;
  return {
    user_result,
    ns_result
  };
};
// 接受邀请
export const acceptInvite = async (props: { k8s_username: string; nsid: string }) => {
  const user = await queryUserByk8sUser(props.k8s_username);
  if (!user) return null;
  const result = await updateUserNS({
    id: user.uid,
    provider: 'uid',
    namespace: {
      status: UserNsStatus.Accepted
    },
    k8s_username: props.k8s_username
  });
  return result;
};
