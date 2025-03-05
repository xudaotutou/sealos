import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { strongPassword } from '@/utils/crypto';
import { enablePassword } from '@/services/enable';
import { getGlobalToken, signUpByCcEmail } from '@/services/backend/globalAuth';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { filterRegisterParams } from '@/services/backend/middleware/ccOauth';
import { ccRegister } from '@/services/backend/svc/ccSvc';
import { getUserKubeconfig } from '@/services/backend/kubernetes/admin';
import { generateAuthenticationToken } from '@/services/backend/auth';
import { HttpStatusCode } from 'axios';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  return filterRegisterParams(req, res, async (params) => {
    const ccResult = await ccRegister(params);
    if (!ccResult.success) {
      // 只保留邮箱被注册的错误
      if (ccResult.status !== HttpStatusCode.Conflict) throw Error('register error');
      return jsonRes(res, {
        code: ccResult.status
        // error: result.error
      });
    }
    const data = ccResult.data.user;
    // register sealos user
    const sealosResult = await signUpByCcEmail({
      email: params.email,
      name: data.id,
      avatar_url: ''
    });
    const sealosUser = sealosResult?.user;
    if (!sealosUser) throw new Error('Failed to edit db');
    const globalToken = generateAuthenticationToken({
      userUid: sealosUser.uid,
      userId: sealosUser.id
    });
    jsonRes(res, {
      code: ccResult.status,
      data: {
        token: globalToken
      }
    });
    return;
  });
});
