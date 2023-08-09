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
  Flex
} from '@chakra-ui/react';
import CustomInput from './Input';
import { useState } from 'react';
import { ROLE_LIST, UserRole } from '@/types/team';
export default function InviteMember({
  nsid,
  ...props
}: Parameters<typeof Image>[0] & {
  nsid: string;
}) {
  const { onOpen, isOpen, onClose } = useDisclosure();
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState(1);
  const submit = () => {
    //!todo
    console.log('invite');
  };
  return (
    <>
      <Image
        onClick={onOpen}
        src="/images/group_add.svg"
        h="16px"
        w="16px"
        {...props}
        cursor={'pointer'}
      />
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent
          borderRadius={'4px'}
          maxW={'380px'}
          bgColor={'#FFF'}
          backdropFilter="blur(150px)"
          p="24px"
        >
          <ModalCloseButton right={'24px'} top="24px" p="0" />
          <ModalHeader p="0">create team</ModalHeader>
          <ModalBody h="100%" w="100%" p="0" mt="22px">
            <CustomInput
              onChange={(e) => {
                e.preventDefault();
                setUserId(e.target.value);
              }}
              placeholder="user id/user namespace"
              value={userId}
            />
            <Menu>
              <MenuButton
                as={Button}
                variant={'unstyled'}
                borderRadius="2px"
                border="1px solid #DEE0E2"
                bgColor="#FBFBFC"
                w="100%"
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
              <MenuList borderRadius={'2px'}>
                {/* roleType != 0 => role != owner*/}
                {ROLE_LIST.map((role, idx) => (
                  <MenuItem
                    w="330px"
                    onClick={(e) => {
                      e.preventDefault();
                      setRole(idx);
                    }}
                    key={idx}
                  >
                    {role}
                  </MenuItem>
                )).filter((_, i) => i != UserRole.Owner)}
              </MenuList>
            </Menu>
            <Button
              w="100%"
              variant={'unstyled'}
              bg="#24282C"
              borderRadius={'4px'}
              color="#fff"
              py="6px"
              px="12px"
              mt="24px"
              _hover={{
                opacity: '0.8'
              }}
              onClick={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              {' '}
              confrim{' '}
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
