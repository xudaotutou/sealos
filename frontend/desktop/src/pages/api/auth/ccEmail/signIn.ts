import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { strongPassword } from '@/utils/crypto';
import { enablePassword } from '@/services/enable';
import { getGlobalToken, signInByCcEmail, signUpByCcEmail } from '@/services/backend/globalAuth';
import { ProviderType } from 'prisma/global/generated/client';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { IRegisterParams } from '@/schema/ccSvc';
import { filterRegisterParams } from '@/services/backend/middleware/ccOauth';
import { ccRegister, cclogin } from '@/services/backend/svc/ccSvc';
import { getUserKubeconfig } from '@/services/backend/kubernetes/admin';
import { generateAuthenticationToken } from '@/services/backend/auth';

// 邮箱验证正则
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 手机号验证正则（示例为11位数字，可根据需求调整）
const phoneRegex = /^1\d{10}$/;

function validateUsername(username: string): boolean {
  return emailRegex.test(username) || phoneRegex.test(username);
}

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  return filterRegisterParams(req, res, async (params) => {
    const ccResult = await cclogin(params);
    if (!ccResult.success) {
      return jsonRes(res, {
        code: ccResult.status
        // error: result.error
      });
    }
    const data = ccResult.data.user;
    // register sealos user
    const sealosResult = await signInByCcEmail(data.email);
    const sealosUser = sealosResult?.user;
    if (!sealosUser) throw new Error('Failed to get userCr');
    const globalToken = generateAuthenticationToken({
      userUid: sealosUser.uid,
      userId: sealosUser.id
    });
    jsonRes(res, {
      data: {
        token: globalToken
      }
    });
    return;
  });
});
