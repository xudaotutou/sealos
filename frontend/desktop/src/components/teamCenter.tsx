import {
  Box,
  Flex,
  Image,
  Stack,
  Text,
  type UseDisclosureProps,
  Modal,
  ModalBody,
  ModalCloseButton,
  Button,
  ModalContent,
  ModalOverlay,
  useDisclosure
} from '@chakra-ui/react';

export default function TeamCenter() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <>
      <Image onClick={onOpen} ml="auto" src="/images/uil_setting.svg" h="16px" w="16px" mr="4px" />
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent borderRadius={'8px'} maxW={'960px'} h="500px">
          <ModalCloseButton />
          <ModalBody></ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
