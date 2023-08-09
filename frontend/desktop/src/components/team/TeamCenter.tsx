import {
  Box,
  Flex,
  Text,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  useDisclosure
} from '@chakra-ui/react';
import NsList from './NsList';
import request from '@/services/request';
import { ApiResp } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { UserNamespace } from '@/services/backend/db/user';
import { useState } from 'react';
import CreateTeam from './CreateTeam';

export default function TeamCenter(props: { nsid: string }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [nsTab, setNsTab] = useState(props.nsid);
  return (
    <>
      <Image onClick={onOpen} ml="auto" src="/images/uil_setting.svg" h="16px" w="16px" mr="4px" />
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent
          borderRadius={'8px'}
          maxW={'960px'}
          h="500px"
          bgColor={'rgba(255, 255, 255, 0.80)'}
          backdropFilter="blur(150px)"
        >
          <ModalCloseButton />
          <ModalBody display={'flex'} h="100%" w="100%" p="0">
            <Box flex="1" px="16px" py="12px">
              <Flex w="100%" py="8px" px="4px" justify={'space-between'} align={'center'} mb="4px">
                <Text fontSize={'12px'}>Namespace</Text>
                <CreateTeam />
              </Flex>
              <NsList selected={(ns) => ns.id === nsTab} click={(ns) => setNsTab(ns.id)} />
            </Box>
            <Box width={'730px'} borderRadius={'8px'} h="100%" bgColor={'white'}></Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
