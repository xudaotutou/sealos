import { authSession, generateJWT } from '@/services/backend/auth';
import { checkInNS } from '@/services/backend/db/namespace';
import { switchNamespace } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { nsid } = req.body;
    if (!nsid) return jsonRes(res, { code: 400, message: 'nsid is required' });
    if (!(await checkInNS({ namespace: nsid, k8s_username: payload.user.k8s_username })))
      return jsonRes(res, { code: 403, message: 'you are not in this namespace' });
    const kubeconfig = switchNamespace(payload.kc, nsid).exportConfig();
    const data = {
      token: generateJWT({
        kubeconfig,
        user: {
          ...payload.user,
          nsid
        }
      }),
      kubeconfig
    };
    return jsonRes(res, {
      data,
      code: 200,
      message: 'Successfully'
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'fail to switch namespace' });
  }
}
