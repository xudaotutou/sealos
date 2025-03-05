import { filterAuthenticationToken } from '@/services/backend/middleware/access';
import { filterInitUser } from '@/services/backend/middleware/checkWorkspaceResource';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { getRegionToken } from '@/services/backend/regionAuth';
import { jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await filterAuthenticationToken(req, res, async ({ userId, userUid }) => {
    await filterInitUser()(req, res, async ({ regionDisplayName, workspaceName }) => {
      const regionData = await getRegionToken({ userId, userUid });
      return jsonRes(res, {
        code: 200,
        message: 'Successfully',
        data: regionData
      });
    });
  });
});
