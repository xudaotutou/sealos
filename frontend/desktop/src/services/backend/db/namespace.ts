import { connectToDatabase } from './mongodb';
async function connectToNSCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<Namespace>('namespace');
  await collection.createIndex({ id: 1 }, { unique: true });
  return collection;
}
export enum UserRole {
  Owner,
  Manager,
  Developer
}
// 可能是私人的ns, 也可能是团队的ns
export enum NSType {
  Team,
  Private
}

export type NSUser = {
  username: string;
  role: UserRole;
};
export type Namespace = {
  // ns 的名字
  id: string;
  // 展示到前端的名字
  teamName?: string;
  // 容纳的所有用户
  users: NSUser[];
  nstype: NSType;
};

export async function getNSUsers({ namespace: id }: { namespace: string }) {
  const collection = await connectToNSCollection();
  let result = await collection.findOne({ id });
  const users = result?.users || [];
  return users;
}
export async function addNSUser({ namespace, user }: { namespace: string; user: NSUser }) {
  const collection = await connectToNSCollection();
  const result = await collection.findOneAndUpdate(
    {
      id: namespace
    },
    {
      $push: {
        users: user
      }
    }
  );
  return result.value;
}
export async function modifyRole({ namespace, user }: { namespace: string; user: NSUser }) {
  const collection = await connectToNSCollection();
  const result = await collection.findOneAndUpdate(
    {
      id: namespace,
      'users.username': user.username
    },
    {
      $set: {
        'users.$.role': user.role
      }
    }
  );
  return result.value;
}
export async function removeNSUser({
  namespace,
  username
}: {
  namespace: string;
  username: string;
}) {
  const collection = await connectToNSCollection();
  return (
    await collection.findOneAndUpdate(
      {
        id: namespace
      },
      {
        $pull: {
          users: {
            username
          }
        }
      }
    )
  ).value;
}
export async function queryNS({ namespace: id }: { namespace: string }) {
  const collection = await connectToNSCollection();
  const ns = await collection.findOne({ id });
  return ns;
}
export async function createNS({
  namespace: id,
  k8s_username: username,
  nstype
}: {
  namespace: string;
  k8s_username: string;
  nstype: NSType;
}): Promise<null | Namespace> {
  const collection = await connectToNSCollection();
  const user = { username, role: UserRole.Developer };
  const ns: Namespace = {
    id,
    users: [],
    nstype
  };
  if (nstype === NSType.Team) {
    user.role = UserRole.Owner;
  } else if (nstype === NSType.Private) {
    user.role = UserRole.Owner;
  } else {
    return null;
  }
  ns.users.push(user);
  await collection.insertOne(ns);
  return ns;
}
export async function removeNS({ namespace: id }: { namespace: string }) {
  const collection = await connectToNSCollection();
  const result = await collection.deleteOne({
    id
  });
  return result.acknowledged;
}

export async function checkIsOwner({
  namespace: id,
  k8s_username: username
}: {
  namespace: string;
  k8s_username: string;
}) {
  const collection = await connectToNSCollection();
  const result = await collection.findOne({
    id,
    users: {
      $in: [
        {
          username,
          role: UserRole.Owner
        }
      ]
    }
  });
  return !!result;
}

export async function checkInNS({
  k8s_username: username,
  namespace
}: {
  k8s_username: string;
  namespace: string;
}) {
  const collection = await connectToNSCollection();
  const result = await collection.findOne({
    id: namespace,
    users: {
      $elemMatch: {
        username,
        role: UserRole.Owner
      }
    }
  });
  return !!result && result.users.length > 0;
}
// 检查用户是否有权限管理namespace, role 为被管理的角色
export async function checkCanManage({
  namespace: id,
  k8s_username: username,
  role
}: {
  namespace: string;
  k8s_username: string;
  role: UserRole;
}) {
  const collection = await connectToNSCollection();
  const result = await collection.findOne({
    id,
    users: {
      $elemMatch: {
        username,
        role: { $in: [UserRole.Owner, UserRole.Manager] }
      }
    }
  });
  return !!result && result.users.length > 0 && result.users[0].role <= role;
}
