import { useCopyData } from '@/hooks/useCopyData';
import request from '@/services/request';
import { Box, Flex, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
// import JsYaml from 'js-yaml';
import Iconfont from '../iconfont';
import { ApiResp } from '@/types';
import { UserNamespace } from '@/services/backend/db/user';
import InviteMember from './InviteMember';
const NsList = ({
  click,
  selected,
  ...boxprop
}: {
  click?: (ns: UserNamespace) => void;
  selected: (ns: UserNamespace) => boolean;
} & Parameters<typeof Box>[0]) => {
  const { data } = useQuery(['listNs'], () =>
    request<any, ApiResp<{ namespaces: any[] }>>('/api/auth/namespace/list')
  );
  const { copyData } = useCopyData();
  const namespaces: UserNamespace[] = data?.data?.namespaces || [];
  return (
    <Box {...boxprop}>
      {namespaces.length > 0 &&
        namespaces.map((ns) => (
          <Flex
            key={ns.id}
            align={'center'}
            py="6px"
            {...(selected(ns)
              ? {
                  borderRadius: '2px',
                  background: 'rgba(0, 0, 0, 0.05)'
                }
              : {})}
            px={'4px'}
          >
            <Flex
              align={'center'}
              cursor={'pointer'}
              onClick={(e) => {
                e.preventDefault();
                click && click(ns);
              }}
            >
              <Box w="8px" h="8px" mr="8px" borderRadius="50%" bgColor="rgba(71, 200, 191, 1)" />
              <Text
                fontSize={'12px'}
                {...(selected(ns)
                  ? {
                      color: '#0884DD'
                    }
                  : {})}
              >
                {ns.id}
              </Text>
            </Flex>
            <InviteMember ml={'auto'} mr="8px" nsid={ns.id} />
            <Box onClick={() => copyData(ns.id)} cursor={'pointer'}>
              <Iconfont iconName="icon-copy2" width={14} height={14} color="#5A646E"></Iconfont>
            </Box>
          </Flex>
        ))}
    </Box>
  );
};

export default NsList;
