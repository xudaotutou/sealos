import { useCopyData } from '@/hooks/useCopyData';
import request from '@/services/request';
import useSessionStore from '@/stores/session';
import download from '@/utils/downloadFIle';
import {
  Box,
  Flex,
  Image,
  Stack,
  Text,
  type UseDisclosureProps,
  PopoverTrigger,
  Popover,
  PopoverContent,
  PopoverBody,
  PopoverHeader,
  useDisclosure
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
// import JsYaml from 'js-yaml';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useContext, useMemo } from 'react';
import Iconfont from '../iconfont';
import { ApiResp } from '@/types';
import useRecharge from '@/hooks/useRecharge';
import { formatMoney } from '@/utils/format';
import { RechargeEnabledContext } from '@/pages';
import { UserNamespace } from '@/services/backend/db/user';
import TeamCenter from '@/components/teamCenter';

const NsMenu = (props: { nsid: string }) => {
  const { data } = useQuery(['listNs'], () =>
    request<any, ApiResp<{ namespaces: any[] }>>('/api/auth/namespace/list')
  );
  const { copyData } = useCopyData();
  const namespaces: UserNamespace[] = data?.data?.namespaces || [];
  return (
    <Popover placement="left">
      <PopoverTrigger>
        {
          <Image
            pr="4px"
            cursor={'pointer'}
            borderRight={'1px'}
            borderColor={'#BDC1C5'}
            mr="10px"
            src="/images/allVector.svg"
            w="16px"
            h="16px"
          />
        }
      </PopoverTrigger>
      <PopoverContent
        shadow={'0px 1.1666667461395264px 2.3333334922790527px 0px rgba(0, 0, 0, 0.2) !important'}
        borderRadius={'8px'}
        p="6px"
      >
        <PopoverHeader py={'8px'} px="4px">
          <Flex w="100%" align={'center'}>
            <Text fontSize="12px">Namespace</Text>
            <TeamCenter />
            <Image src="/images/material-symbols_add.svg" h="16px" w="16px" />
          </Flex>
        </PopoverHeader>
        <PopoverBody px="0" pb="0" pt="4px">
          <Box>
            {namespaces.length > 0 &&
              namespaces.map((ns) => (
                <Flex
                  key={ns.id}
                  align={'center'}
                  py="6px"
                  {...(ns.id === props.nsid
                    ? {
                        borderRadius: '2px',
                        background: 'rgba(0, 0, 0, 0.05)'
                      }
                    : {})}
                  px={'4px'}
                >
                  <Box
                    w="8px"
                    h="8px"
                    mr="8px"
                    borderRadius="50%"
                    bgColor="rgba(71, 200, 191, 1)"
                  />
                  <Text fontSize={'12px'}>{ns.id}</Text>

                  <Box onClick={() => copyData(ns.id)} ml="auto" cursor={'pointer'}>
                    <Iconfont
                      iconName="icon-copy2"
                      width={14}
                      height={14}
                      color="#5A646E"
                    ></Iconfont>
                  </Box>
                </Flex>
              ))}
          </Box>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};
export default function Index({ disclosure }: { disclosure: UseDisclosureProps }) {
  const router = useRouter();
  const rechargeEnabled = useContext(RechargeEnabledContext);
  const { t } = useTranslation();
  const { delSession, getSession } = useSessionStore();
  const { user, kubeconfig } = getSession();
  const { copyData } = useCopyData();

  const { data, refetch } = useQuery(['getAccount'], () =>
    request<any, ApiResp<{ balance: number; deductionBalance: number; status: string }>>(
      '/api/account/getAmount'
    )
  );

  const balance = useMemo(() => {
    let real_balance = data?.data?.balance || 0;
    if (data?.data?.deductionBalance) {
      real_balance -= data?.data.deductionBalance;
    }
    return real_balance;
  }, [data]);
  const session = useSessionStore((s) => s.session);
  // const k8s_username = session?.user?.k8s_username || '';
  const namespace = session?.user?.nsid || '';
  const { RechargeModal, onOpen } = useRecharge({
    onPaySuccess: () => {
      refetch();
    }
  });
  const logout = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    delSession();
    router.reload();
  };

  return disclosure.isOpen ? (
    <>
      <Box position={'fixed'} inset={0} zIndex={'998'} onClick={disclosure.onClose}></Box>
      <Box
        w="297px"
        bg="rgba(255, 255, 255, 0.6)"
        boxShadow={'0px 1px 2px rgba(0, 0, 0, 0.2)'}
        position={'absolute'}
        top="48px"
        right={0}
        zIndex={'999'}
        borderRadius={'8px'}
        p="20px"
        backdropFilter={'blur(150px)'}
      >
        <Flex justifyContent={'end'} alignItems={'center'} overflow={'hidden'}>
          <Iconfont iconName="icon-logout" width={14} height={14} color="#24282C"></Iconfont>
          <Text ml="6px" color={'#24282C'} fontSize={'12px'} fontWeight={500} onClick={logout}>
            {t('Log Out')}
          </Text>
        </Flex>
        <Flex mt="8px" justifyContent={'center'} alignItems={'center'} flexDirection={'column'}>
          <Image
            width={'80px'}
            height={'80px'}
            borderRadius="full"
            src={user?.avatar}
            fallbackSrc="/images/sealos.svg"
            alt="user avator"
          />
          <Text color={'#24282C'} fontSize={'20px'} fontWeight={600}>
            {user?.name}
          </Text>
          <Flex
            alignItems={'center'}
            mt="8px"
            bg={'#FFFFFF'}
            py="6px"
            px={'12px'}
            color="#5A646E"
            borderRadius={'50px'}
          >
            <NsMenu nsid={namespace} />
            <Text fontSize={'12px'}>{namespace}</Text>
            <Box onClick={() => copyData(namespace)} ml="8px" cursor={'pointer'}>
              <Iconfont iconName="icon-copy2" width={14} height={14} color="#5A646E"></Iconfont>
            </Box>
          </Flex>
          <Stack
            direction={'column'}
            width={'100%'}
            mt="12px"
            bg="rgba(255, 255, 255, 0.6)"
            borderRadius={'8px'}
            gap={'0px'}
          >
            <Flex alignItems={'center'} borderBottom={'1px solid #0000001A'} p="16px">
              <Text>
                {t('Balance')}: ￥{formatMoney(balance).toFixed(2)}
              </Text>
              {rechargeEnabled && (
                <Box
                  ml="auto"
                  onClick={() => onOpen()}
                  color={'#219BF4'}
                  fontWeight="500"
                  fontSize="12px"
                >
                  {t('Charge')}
                </Box>
              )}
            </Flex>
            {
              <Flex alignItems={'center'} py="16px">
                <Text ml="16px">kubeconfig</Text>
                <Box ml="auto" onClick={() => download('kubeconfig.yaml', kubeconfig)}>
                  <Iconfont
                    iconName="icon-download"
                    width={16}
                    height={16}
                    color="#219BF4"
                  ></Iconfont>
                </Box>
                <Box ml="8px" mr="20px" onClick={() => copyData(kubeconfig)} cursor={'pointer'}>
                  <Iconfont iconName="icon-copy2" width={16} height={16} color="#219BF4"></Iconfont>
                </Box>
              </Flex>
            }
          </Stack>
        </Flex>
      </Box>
      {rechargeEnabled && <RechargeModal balance={balance}></RechargeModal>}
    </>
  ) : (
    <></>
  );
}
