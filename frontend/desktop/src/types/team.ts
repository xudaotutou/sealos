import * as yaml from 'js-yaml';
export type RoleAction = 'Grant' | 'Deprive' | 'Change';
export const ROLE_LIST = ['Owner', 'Manager', 'Developer'] as const;
export type RoleType = (typeof ROLE_LIST)[number];
type CRD = {
  apiVersion: 'user.sealos.io/v1';
  kind: 'Operationrequest';
  spec: {
    Username: string;
    Action: Exclude<RoleAction, 'Change'>;
    Namespace: string;
    Type: RoleType;
  };
};

export const generateRequestCrd = (props: CRD['spec']) => {
  const requestCrd: CRD = {
    apiVersion: 'user.sealos.io/v1',
    kind: 'Operationrequest',
    spec: {
      Username: props.Username,
      Action: props.Action,
      Namespace: props.Namespace,
      Type: props.Type
    }
  };

  try {
    const result = yaml.dump(requestCrd);
    return result;
  } catch (error) {
    return '';
  }
};
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
