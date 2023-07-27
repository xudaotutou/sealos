import { Session } from '@/types';
import { generateJWT } from './auth';
import { K8s_user, addK8sUser, createUser, queryUser, removeUser, updateUser } from './db/user';
import { Provider } from '@/types/user';
import { getUserKubeconfig, getUserKubeconfigByuid } from './kubernetes/admin';
import { hashPassword, verifyPassword } from '@/utils/crypto';
import { NSType, createNS, queryNS } from './db/namespace';

export const getOauthRes = async ({
  provider,
  id,
  name,
  avatar_url,
  password
}: {
  provider: Provider;
  id: string;
  name: string;
  avatar_url: string;
  password?: string;
}): Promise<Session> => {
  if (provider === 'password_user' && !password) {
    throw new Error('password is required');
  }
  const _user = await queryUser({ id, provider });
  let k8s_users: K8s_user[] = [];
  let displayName = '';
  let avatar = '';
  let uid = '';
  if (!_user) {
    // sign up
    const result = await createUser({ id: '' + id, provider, name, avatar_url });
    if (provider === 'password_user') {
      await updateUser({
        id: '' + id,
        provider: 'password_user',
        data: { password: hashPassword(password!) }
      }).catch(async (_) => {
        await removeUser({ id: '' + id, provider: 'password_user' });
        throw new Error('Failed to create user by password');
      });
    }
    displayName = result.name;
    avatar = result.avatar_url;
    k8s_users = result.k8s_users || [];
    uid = result.uid;
  } else {
    if (provider === 'password_user') {
      if (!_user.password || !password || !verifyPassword(password, _user.password)) {
        throw new Error('password error');
      }
    }
    displayName = _user.name;
    avatar = _user.avatar_url;
    k8s_users = _user.k8s_users || [];
    uid = _user.uid;
    // 迁移用户和namespace的
    if (k8s_users.length === 0) {
      const k8s_username = await getUserKubeconfigByuid(uid);
      if (!!k8s_username) {
        const result = await addK8sUser({
          id: '' + id,
          provider,
          k8s_user: {
            name: k8s_username
          }
        });
        if (!result) return Promise.reject('Faild to add k8s user');
        k8s_users = [result];
      }
    }
  }
  const k8s_user = k8s_users[0];
  const k8s_username = k8s_user.name;
  // 登录和注册都需要对namespace表做校检
  const private_namespace = k8s_user.namespaces?.find((ns) => ns.nstype === NSType.Private);
  if (!private_namespace) return Promise.reject('Faild to get private namespace');
  const ns = await queryNS({ namespace: private_namespace.id });
  if (!ns) {
    const result_ns = await createNS({
      namespace: private_namespace.id,
      nstype: private_namespace.nstype,
      k8s_username
    });
    if (!result_ns) return Promise.reject('Faild to create namespace');
  }
  const kubeconfig = await getUserKubeconfig(uid, k8s_username);
  if (!kubeconfig) {
    throw new Error('Failed to get user config');
  }
  const token = generateJWT({
    user: { k8s_username, uid, nsid: private_namespace.id },
    kubeconfig
  });
  return {
    token,
    user: {
      name: displayName,
      k8s_username,
      avatar,
      nsid: private_namespace.id
    },
    kubeconfig
  };
};
