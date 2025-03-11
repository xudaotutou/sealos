import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { strongPassword } from '@/utils/crypto';
import { enableEmailSms, enablePassword } from '@/services/enable';
import { getGlobalToken, signUpByEmail } from '@/services/backend/globalAuth';
import { ProviderType } from 'prisma/global/generated/client';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { registerParamsSchema } from '@/schema/email';
import { HttpStatusCode } from 'axios';
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableEmailSms()) {
    throw new Error('SMS is not enabled');
  }
  const result = registerParamsSchema.safeParse(req.body);
  if (!result.success) {
    return jsonRes(res, {
      message:
        'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number and one special character',
      code: HttpStatusCode.BadRequest
    });
  }
  const { user: name, password, firstname, lastname } = result.data;
  const data = await signUpByEmail({
    id: name,
    password,
    name,
    firstname,
    lastname
  });
  if (!data)
    return jsonRes(res, {
      code: HttpStatusCode.Unauthorized,
      message: 'Unauthorized'
    });
  return jsonRes(res, {
    data: {
      token: data,
      needInit: true
    },
    code: 200,
    message: 'Successfully'
  });
});
