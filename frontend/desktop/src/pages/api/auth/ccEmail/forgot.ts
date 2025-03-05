import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { strongPassword } from '@/utils/crypto';
import { enablePassword } from '@/services/enable';
import { getGlobalToken, signUpByCcEmail } from '@/services/backend/globalAuth';
import { ErrorHandler } from '@/services/backend/middleware/error';
import {
  filterForgotPasswordParams,
  filterRegisterParams
} from '@/services/backend/middleware/ccOauth';
import { ccForget, ccRegister } from '@/services/backend/svc/ccSvc';
import { getUserKubeconfig } from '@/services/backend/kubernetes/admin';
import { generateAuthenticationToken } from '@/services/backend/auth';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  return filterForgotPasswordParams(req, res, async (params) => {
    const ccResult = await ccForget(params);
    if (!ccResult.success) {
      return jsonRes(res, {
        code: ccResult.status
      });
    }
    return jsonRes(res, {
      code: ccResult.status
    });
  });
});
