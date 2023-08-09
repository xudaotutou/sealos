import { authSession } from '@/services/backend/auth';
import { UserRole, checkCanManage } from '@/services/backend/db/namespace';
import { jsonRes } from '@/services/backend/response';
import { bindingRole } from '@/services/backend/team';
import { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { nsid, targetUsername, role } = req.body as {
      nsid?: string;
      targetUsername?: string;
      role?: UserRole;
    };
    if (!nsid) return jsonRes(res, { code: 400, message: 'nsid is required' });
    if (!targetUsername) return jsonRes(res, { code: 400, message: 'targetUsername is required' });
    if (undefined === role) return jsonRes(res, { code: 400, message: 'role is required' });
    if (!checkCanManage({ namespace: nsid, k8s_username: payload.user.k8s_username, role }))
      return jsonRes(res, { code: 403, message: 'you are not manager' });
    const result = await bindingRole({
      k8s_username: targetUsername,
      nsid,
      role
    });
    if (!result) throw new Error('fail to modify role');
    jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: {
        users: result.users,
        namesapce: result
      }
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'invite member error' });
  }
}
