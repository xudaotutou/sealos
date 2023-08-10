import { authSession } from '@/services/backend/auth';
import { queryNS } from '@/services/backend/db/namespace';
import { queryUser } from '@/services/backend/db/user';
import { jsonRes } from '@/services/backend/response';
import { acceptInvite, modifyTeamRole, unbindingRole } from '@/services/backend/team';

import { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    //
    const { nsid, action } = req.body as { nsid?: string; action?: 'accept' | 'reject' };
    if (!nsid) return jsonRes(res, { code: 400, message: 'nsid is required' });

    const target_ns = await queryNS({ namespace: nsid });
    if (!target_ns) return jsonRes(res, { code: 404, message: 'fail to get ns' });
    // 邀请状态这层,
    const user = await queryUser({ id: payload.user.uid, provider: 'uid' });
    if (!user) return jsonRes(res, { code: 404, message: 'fail to get user' });
    const userNs = user.k8s_users?.[0].namespaces?.find((item) => item.id === nsid);
    if (!userNs) return jsonRes(res, { code: 404, message: 'fail to modify role' });

    let ns_result = null;
    let user_result = null;
    const k8s_username = payload.user.k8s_username;
    if (action === 'accept') {
      user_result = await acceptInvite({
        k8s_username,
        nsid
      });
    } else if (action === 'reject') {
      const _result = await modifyTeamRole({
        k8s_username,
        role: userNs.role,
        action: 'Deprive',
        ns: target_ns,
        user
      });
      if (!_result || _result.length === 0)
        return jsonRes(res, { message: 'fail to modify team role', code: 403 });
      const unbindingResult = await unbindingRole({ k8s_username, nsid });
      if (!unbindingResult)
        return jsonRes(res, { message: 'fail to unbinding', code: 403 });
      ns_result = unbindingResult.ns_result;
      user_result = unbindingResult.user_result;
    }
    if (!user_result)
      return jsonRes(res, {
        code: 404,
        message: 'failed to change Status'
      });

    jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: {
        // 如果reject会修改两者，而accept 只修改user表的accept标识
        users: ns_result?.users || target_ns.users,
        namespaces: user_result?.k8s_users?.[0].namespaces || []
      }
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'get price error' });
  }
}
