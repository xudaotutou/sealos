import {
  Box,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  useDisclosure
} from '@chakra-ui/react';

export default function TeamCenter() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <>
      <Image onClick={onOpen} ml="auto" src="/images/uil_setting.svg" h="16px" w="16px" mr="4px" />
      <Modal isOpen={isOpen} onClose={onClose} isCentered >
        <ModalOverlay />
        <ModalContent borderRadius={'8px'} maxW={'960px'} h="500px" bgColor={'rgba(255, 255, 255, 0.80)'} backdropFilter='blur(150px)' >
          <ModalCloseButton />
          <ModalBody display={'flex'} h='100%' w='100%' p='0'>
            <Box flex='1'></Box>
            <Box width={'730px'} borderRadius={'8px'} h='100%' bgColor={'white'}></Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}