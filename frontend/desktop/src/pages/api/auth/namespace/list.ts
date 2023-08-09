import { authSession } from '@/services/backend/auth';
import { getUserNs } from '@/services/backend/db/user';
import { jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const k8s_username = payload.user.k8s_username;
    const namespaces = await getUserNs({ id: payload.user.uid, provider: 'uid', k8s_username });
    jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: {
        namespaces
      }
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'list ns error' });
  }
}
