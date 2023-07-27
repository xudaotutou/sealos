import { authSession } from '@/services/backend/auth';
import { checkIsOwner, queryNS, removeNS } from '@/services/backend/db/namespace';
import { queryUser } from '@/services/backend/db/user';
import { jsonRes } from '@/services/backend/response';
import { modifyTeamRole, unbindingRole } from '@/services/backend/team';
import { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 403, message: 'token verify error' });
    const { user: tokenUser } = payload;
    const k8s_username = tokenUser.k8s_username;
    const nsid = tokenUser.nsid;
    if (!nsid) return jsonRes(res, { code: 400, message: 'nsid is required' });
    const user = await queryUser({ id: tokenUser.uid, provider: 'uid' });
    if (!user)
      return jsonRes(res, { code: 404, message: `the user ${tokenUser.uid} is not found` });
    if (!(await checkIsOwner({ namespace: nsid, k8s_username })))
      return jsonRes(res, { code: 403, message: 'you are not owner' });
    const namespace = await queryNS({ namespace: nsid });
    if (!namespace) return jsonRes(res, { code: 404, message: 'fail to get ns' });
    const users = namespace.users;
    if (!users) return jsonRes(res, { code: 404, message: 'fail to get ns' });
    const results = await Promise.all(
      users.map(async (item) => {
        // 保证每个用户都清掉
        const _result = await unbindingRole({ k8s_username: item.username, nsid });
        if (!_result) return false;
        const result = await modifyTeamRole({
          k8s_username: item.username,
          role: item.role,
          action: 'Deprive',
          ns: namespace,
          user
        });
        return result;
      })
    );
    if (!results.every((x) => x)) return jsonRes(res, { code: 404, message: 'fail to remove ns' });
    const result_ns = await removeNS({ namespace: nsid });
    if (!result_ns) return jsonRes(res, { code: 404, message: 'fail to remove ns' });
    jsonRes(res, { code: 200, message: 'Successfully' });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'fail to remove ns' });
  }
}
