import { connectToDatabase } from './mongodb';
import { PROVIDERS, Provider } from '@/types/user';
import { customAlphabet } from 'nanoid';
import { v4 as uuid } from 'uuid';
import { NSType, UserRole } from './namespace';
import { GetUserDefaultNameSpace, K8sApi } from '../kubernetes/user';
const LetterBytes = 'abcdefghijklmnopqrstuvwxyz0123456789';
const HostnameLength = 8;

const nanoid = customAlphabet(LetterBytes, HostnameLength);
async function connectToUserCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<User>('user');
  await collection.createIndex({ uid: 1 }, { unique: true });
  await collection.createIndex({ 'k8s_users.name': 1 }, { unique: true, sparse: true });
  await collection.createIndex({ password_user: 1 }, { unique: true, sparse: true });
  return collection;
}
export type K8s_user = {
  name: string;
  namespaces?: UserNamespace[];
};
export enum UserNsStatus {
  Inviting,
  Accepted,
  Rejected
}
export type UserNamespace = {
  id: string;
  nstype: NSType;
  status: UserNsStatus;
  role: UserRole;
};
export type User = {
  uid: string;
  avatar_url: string;
  name: string;
  github?: string;
  wechat?: string;
  phone?: string;
  k8s_users?: K8s_user[];
  created_time: string;
  password?: string;
  password_user?: string;
};

export async function queryUser({ id, provider }: { id: string; provider: Provider }) {
  const users = await connectToUserCollection();
  if (!verifyProvider(provider)) return Promise.reject('provider error');
  return await users.findOne({ [provider]: id });
}
export async function queryUserByk8sUser(k8s_useranme: string) {
  const users = await connectToUserCollection();
  return await users.findOne({ 'k8s_users.name': k8s_useranme });
}
export async function createUser({
  id,
  provider,
  name,
  avatar_url
}: {
  id: string;
  provider: Provider;
  name: string;
  avatar_url: string;
}) {
  const users = await connectToUserCollection();

  let uid = uuid();
  const k8s_username = await get_k8s_username();
  let user: User = {
    uid,
    avatar_url,
    name,
    created_time: new Date().toISOString(),
    k8s_users: [
      {
        name: k8s_username,
        namespaces: [
          {
            id: GetUserDefaultNameSpace(k8s_username),
            nstype: NSType.Private,
            status: UserNsStatus.Accepted,
            role: UserRole.Owner
          }
        ]
      }
    ]
  };
  if (!verifyProvider(provider)) return Promise.reject('provider error');
  user[provider] = id;
  await users.insertOne(user);
  return user;
}
export async function updateUser({
  id,
  provider,
  data
}: {
  id: string;
  provider: Provider;
  data: Partial<Omit<User, 'provider'>>;
}) {
  const users = await connectToUserCollection();
  if (!verifyProvider(provider)) return Promise.reject('provider error');
  return await users.updateOne({ [provider]: id }, { $set: data });
}
export async function addK8sUser({
  id,
  provider,
  k8s_user
}: {
  id: string;
  provider: Provider;
  k8s_user?: K8s_user;
}) {
  const users = await connectToUserCollection();

  if (k8s_user === undefined) {
    const name = await get_k8s_username();
    k8s_user = {
      name
    };
  }
  if (!k8s_user.namespaces) {
    k8s_user.namespaces = [
      {
        id: GetUserDefaultNameSpace(k8s_user.name),
        nstype: NSType.Private,
        status: UserNsStatus.Accepted,
        role: UserRole.Owner
      }
    ];
  }
  if (!verifyProvider(provider)) return Promise.reject('provider error');
  const result = await users.updateOne({ [provider]: id }, { $addToSet: { k8s_users: k8s_user } });
  if (!result.acknowledged) {
    return undefined;
  }
  return k8s_user as Required<K8s_user>;
}
export async function removeK8sUser({
  id,
  provider,
  k8s_username
}: {
  id: string;
  provider: Provider;
  k8s_username: string;
}) {
  const users = await connectToUserCollection();
  if (!verifyProvider(provider)) return Promise.reject('provider error');
  return await users.updateOne(
    { [provider]: id },
    { $pull: { k8s_users: { name: k8s_username } } }
  );
}
function verifyProvider(provider: string): provider is Provider {
  return PROVIDERS.includes(provider as Provider);
}
export async function get_k8s_username() {
  const users = await connectToUserCollection();
  let k8s_username = nanoid();
  let len = 5;
  while ((await users.findOne({ namespaces: { name: k8s_username } })) && len--) {
    k8s_username = nanoid();
  }
  if (len < 0) {
    return Promise.reject('user are too many to be created');
  }
  return k8s_username;
}
export async function removeUser({ id, provider }: { id: string; provider: Provider }) {
  const users = await connectToUserCollection();
  if (!verifyProvider(provider)) return Promise.reject('provider error');
  return await users.deleteOne({ [provider]: id });
}
export async function addUserNS({
  id,
  provider,
  namespace,
  k8s_username
}: {
  id: string;
  provider: Provider;
  namespace: UserNamespace;
  k8s_username: string;
}) {
  const userCollection = await connectToUserCollection();
  if (!verifyProvider(provider)) return Promise.reject('provider error');
  const result = await userCollection.updateOne(
    {
      [provider]: id,
      'k8s_users.name': k8s_username
    },
    {
      $push: {
        'k8s_users.$.namespaces': namespace
      }
    }
  );
  return result.acknowledged;
}
export async function updateUserNS({
  id,
  provider,
  namespace,
  k8s_username
}: {
  id: string;
  provider: Provider;
  namespace: Partial<UserNamespace>;
  k8s_username: string;
}) {
  const userCollection = await connectToUserCollection();
  if (!verifyProvider(provider)) return Promise.reject('provider error');
  const result = await userCollection.findOneAndUpdate(
    {
      [provider]: id,
      k8s_users: { $elemMatch: { name: k8s_username, 'namespaces.id': namespace.id } }
    },
    {
      $set: {
        'k8s_users.$.namespaces.$[ns]': {
          NSType: namespace.nstype,
          status: namespace.status
        }
      }
    },
    {
      arrayFilters: [{ 'ns.id': namespace.id }]
    }
  );
  return result.value;
}
export async function removeUserNs({
  id,
  provider,
  namespace,
  k8s_username
}: {
  id: string;
  provider: Provider;
  namespace: string;
  k8s_username: string;
}) {
  const userCollection = await connectToUserCollection();
  if (!verifyProvider(provider)) return Promise.reject('provider error');
  const result = await userCollection.findOneAndUpdate(
    {
      [provider]: id,
      'k8s_users.name': k8s_username
    },
    {
      $pull: {
        'k8s_users.$.namespaces': {
          id: namespace
        }
      }
    }
  );
  return result.value;
}
export async function getUserNs({
  id,
  provider,
  k8s_username
}: {
  id: string;
  provider: Provider;
  k8s_username?: string;
}) {
  const userCollection = await connectToUserCollection();
  if (!verifyProvider(provider)) return Promise.reject('provider error');

  if (!k8s_username) {
    // 获取所有user的所有namespace !todo
    const result = await userCollection.findOne({
      [provider]: id
    });
    const k8s_users = result?.k8s_users || [];
    if (k8s_users.length === 0) return [];
    // 也许要去重？
    return k8s_users.flatMap((k8s_user) => k8s_user.namespaces || []);
  } else {
    // 获取指定user的所有namespace
    const result = await userCollection.findOne({
      [provider]: id,
      'k8s_users.name': k8s_username
    });
    const k8s_users = result?.k8s_users || [];
    if (k8s_users.length === 0) return [];

    return k8s_users[0].namespaces || [];
  }
}
