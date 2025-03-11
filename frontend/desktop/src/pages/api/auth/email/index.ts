import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { strongPassword } from '@/utils/crypto';
import { enableEmailSms, enablePassword } from '@/services/enable';
import { getPasswordStrength } from '@/utils/tools';
import { HttpStatusCode } from 'axios';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { generateAuthenticationToken } from '@/services/backend/auth';
import { loginParamsSchema } from '@/schema/email';
import { signInByEmail } from '@/services/backend/globalAuth';
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableEmailSms()) {
    throw new Error('SMS is not enabled');
  }
  const parseResult = loginParamsSchema.safeParse(req.body);
  if (!parseResult.success) {
    return jsonRes(res, {
      message: parseResult.error.message,
      code: HttpStatusCode.BadRequest
    });
  }
  const { user: name, password } = parseResult.data;
  const sealosResult = await signInByEmail({
    id: name,
    password
  });
  const sealosUser = sealosResult?.user;
  if (!sealosUser) throw new Error('Failed to get userCr');
  const globalToken = generateAuthenticationToken({
    userUid: sealosUser.uid,
    userId: sealosUser.id
  });
  jsonRes(res, {
    data: {
      token: globalToken,
      needInit: !sealosResult.user.userInfo?.isInited
    }
  });
});
