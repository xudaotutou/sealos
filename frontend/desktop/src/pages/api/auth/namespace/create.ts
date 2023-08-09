import { authSession } from '@/services/backend/auth';
import { UserRole, createNS } from '@/services/backend/db/namespace';
import { get_k8s_username, queryUser } from '@/services/backend/db/user';
import { getUserKubeconfig } from '@/services/backend/kubernetes/admin';
import { GetUserDefaultNameSpace } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import { bindingRole, modifyTeamRole } from '@/services/backend/team';
import { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { user: tokenUser } = payload;
    const { teamName } = req.body as { teamName?: string };
    if (!teamName) return jsonRes(res, { code: 400, message: 'teamName is required' });
    const user = await queryUser({ id: tokenUser.uid, provider: 'uid' });
    if (!user) throw new Error('fail to get user');
    const ns_creater = await get_k8s_username();
    if (!ns_creater) throw new Error('fail to get ns_creater');
    // 创建伪user
    const creater_kc_str = await getUserKubeconfig(user.uid, ns_creater);
    if (!creater_kc_str) throw new Error('fail to get kubeconfig');
    const k8s_username = tokenUser.k8s_username;
    const nsid = GetUserDefaultNameSpace(ns_creater);
    // 分配owner权限
    const namespace = await bindingRole({
      k8s_username,
      nsid,
      role: UserRole.Owner,
      direct: true,
      teamName
    });
    if (!namespace) return jsonRes(res, { code: 404, message: 'fail to bindging Role' });
    const result = await modifyTeamRole({
      k8s_username,
      role: UserRole.Owner,
      action: 'Grant',
      ns: namespace,
      user
    });
    if (!result) return jsonRes(res, { code: 403, message: 'fail to get owner permission' });
    jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: {
        nsid: GetUserDefaultNameSpace(k8s_username)
      }
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'failed to create team' });
  }
}
