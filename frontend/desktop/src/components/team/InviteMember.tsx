import {
  Button,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  Flex,
  Spinner,
  ButtonProps,
  HStack,
  useToast
} from '@chakra-ui/react';
import { useState } from 'react';
import { ROLE_LIST, UserRole } from '@/types/team';
import useSessionStore from '@/stores/session';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInviteCodeRequest, inviteMemberRequest } from '@/api/namespace';
import { vaildManage } from '@/utils/tools';
import { ApiResp } from '@/types';
import { useTranslation } from 'react-i18next';
import { GroupAddIcon } from '@sealos/ui';
import { useCopyData } from '@/hooks/useCopyData';

export default function InviteMember({
  ns_uid,
  ownRole,
  ...props
}: ButtonProps & {
  ns_uid: string;
  ownRole: UserRole;
}) {
  const { onOpen, isOpen, onClose } = useDisclosure();
  const session = useSessionStore((s) => s.session);
  const k8s_username = session?.user.k8s_username;
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState(UserRole.Developer);
  const toast = useToast();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: inviteMemberRequest,
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['ns-detail'], exact: false });
      onClose();
    },
    onError(error) {
      toast({
        status: 'error',
        title: (error as ApiResp).message,
        isClosable: true,
        position: 'top'
      });
    }
  });
  const canManage = vaildManage(ownRole);
  const { t } = useTranslation();
  // const submit = () => {
  //   let trim_to = userId.trim();
  //   if (!trim_to || trim_to.length !== 10) {
  //     toast({
  //       status: 'error',
  //       title: t('Invalid User ID'),
  //       isClosable: true,
  //       position: 'top'
  //     });
  //     return;
  //   }
  //   const tk8s_username = trim_to.startsWith('ns-') ? trim_to.replace('ns-', '') : trim_to;
  //   if (tk8s_username === k8s_username) {
  //     toast({
  //       status: 'error',
  //       title: t('The invited user must be others'),
  //       isClosable: true,
  //       position: 'top'
  //     });
  //     return;
  //   }
  //   mutation.mutate({
  //     ns_uid,
  //     targetUserId: trim_to,
  //     role
  //   });
  // };
  const { copyData } = useCopyData();
  const getLinkCode = useMutation({
    mutationFn: getInviteCodeRequest,
    mutationKey: [session?.user.ns_uid]
  });
  const generateLink = (code: string) => {
    return window.location.origin + encodeURI(`/WorkspaceInvite/?code=${code}`);
  };
  return (
    <>
      {[UserRole.Manager, UserRole.Owner].includes(ownRole) ? (
        <Button
          size={'sm'}
          variant={'outline'}
          height={'32px'}
          {...props}
          leftIcon={<GroupAddIcon boxSize={'16px'} />}
          onClick={onOpen}
        >
          {t('Invite Member')}
        </Button>
      ) : (
        <></>
      )}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent
          borderRadius={'4px'}
          maxW={'380px'}
          bgColor={'#FFF'}
          backdropFilter="blur(150px)"
          p="24px"
        >
          <ModalCloseButton right={'24px'} top="16px" p="0" />
          <ModalHeader bg={'white'} border={'none'} p="0">
            {t('Invite Member')}
          </ModalHeader>
          {mutation.isLoading ? (
            <Spinner mx="auto" />
          ) : (
            <ModalBody h="100%" w="100%" p="0" mt="22px">
              {/*<CustomInput*/}
              {/*  onChange={(e) => {*/}
              {/*    e.preventDefault();*/}
              {/*    setUserId(e.target.value);*/}
              {/*  }}*/}
              {/*  placeholder={t('private team ID of user') || ''}*/}
              {/*  value={userId}*/}
              {/*/>*/}
              <Text>邀请成员至 工作空间名称</Text>
              <HStack gap={'8px'} justifyContent={'stretch'}>
                <Menu>
                  <MenuButton
                    as={Button}
                    variant={'unstyled'}
                    borderRadius="2px"
                    border="1px solid #DEE0E2"
                    bgColor="#FBFBFC"
                    w="140px"
                    mt="24px"
                    px="12px"
                  >
                    <Flex alignItems={'center'} justifyContent={'space-between'}>
                      <Text>{ROLE_LIST[role]}</Text>
                      <Image
                        src="/images/material-symbols_expand-more-rounded.svg"
                        w="16px"
                        h="16px"
                        transform={'rotate(90deg)'}
                      />
                    </Flex>
                  </MenuButton>
                  <MenuList borderRadius={'2px'} minW={'unset'}>
                    {ROLE_LIST.map((role, idx) => (
                      <MenuItem
                        w="140px"
                        onClick={(e) => {
                          e.preventDefault();
                          setRole(idx);
                        }}
                        key={idx}
                      >
                        {role}
                      </MenuItem>
                    )).filter((_, i) => canManage(i, false) && i !== UserRole.Owner)}
                  </MenuList>
                </Menu>
                <Button
                  flex={'1'}
                  variant={''}
                  bg="#24282C"
                  borderRadius={'4px'}
                  color="#fff"
                  py="6px"
                  px="12px"
                  mt="24px"
                  _hover={{
                    opacity: '0.8'
                  }}
                  isDisabled={getLinkCode.isLoading}
                  onClick={async (e) => {
                    e.preventDefault();
                    const data = await getLinkCode.mutateAsync({
                      ns_uid,
                      role
                    });
                    const code = data.data?.code!;
                    const link = generateLink(code);
                    await copyData(link);
                  }}
                >
                  {t('Generate Link')}
                </Button>
              </HStack>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
