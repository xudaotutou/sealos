import useCustomError from '@/components/signin/auth/useCustomError';
import usePassword from '@/components/signin/auth/usePassword';
import useProtocol from '@/components/signin/auth/useProtocol';
import useSms from '@/components/signin/auth/useSms';
import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import { LoginType } from '@/types';
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Heading,
  Input,
  Link,
  Stack,
  Text,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react';
import { TurnstileInstance } from '@marsidev/react-turnstile';
import { useQueryClient } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TCaptchaInstance } from './Captcha';
import useWechat from './auth/useWechat';

export default function SigninComponent() {
  const conf = useConfigStore();
  const hasBaiduToken = conf.authConfig?.hasBaiduToken;
  const needPassword = conf.authConfig?.idp.password?.enabled;
  const needPhone = conf.authConfig?.idp.sms?.enabled && conf.authConfig.idp.sms.ali.enabled;
  const needTabsCount = 0 + (conf.authConfig?.idp.password?.enabled ? 1 : 0) + (needPhone ? 1 : 0);
  const disclosure = useDisclosure();
  const { t, i18n } = useTranslation();
  const [tabIndex, setTabIndex] = useState<LoginType>(LoginType.NONE);

  const { ErrorComponent, showError } = useCustomError();
  let protocol_data: Parameters<typeof useProtocol>[0];
  if (['zh', 'zh-Hans'].includes(i18n.language))
    protocol_data = {
      service_protocol: conf.layoutConfig?.protocol?.serviceProtocol.zh as string,
      private_protocol: conf.layoutConfig?.protocol?.privateProtocol.zh as string
    };
  else
    protocol_data = {
      service_protocol: conf.layoutConfig?.protocol?.serviceProtocol.en as string,
      private_protocol: conf.layoutConfig?.protocol?.privateProtocol.en as string
    };
  const { Protocol, isAgree, setIsInvalid } = useProtocol(protocol_data!);
  const { WechatComponent, login: wechatSubmit } = useWechat();
  const { SmsModal, login: smsSubmit, isLoading: smsLoading } = useSms({ showError });
  const {
    PasswordComponent,
    pageState,
    login: passwordSubmit,
    isLoading: passwordLoading
  } = usePassword({ showError });
  const isLoading = useMemo(() => passwordLoading || smsLoading, [passwordLoading, smsLoading]);
  const isSignIn = useSessionStore((s) => s.isUserLogin);
  const delSession = useSessionStore((s) => s.delSession);
  const setToken = useSessionStore((s) => s.setToken);
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (isSignIn()) {
      router.replace('/');
    } else {
      queryClient.clear();
      delSession();
      setToken('');
    }
  }, []);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const captchaRef = useRef<TCaptchaInstance>(null);
  const loginConfig = useMemo(() => {
    return {
      [LoginType.SMS]: {
        login: smsSubmit,
        component: (
          <SmsModal
            onAfterGetCode={() => {
              turnstileRef.current?.reset();
              captchaRef.current?.reset();
            }}
            getCfToken={async () => {
              const token = await captchaRef.current?.getToken();
              const turnstiletoken = turnstileRef.current?.getResponse();
              return token;
            }}
          />
        )
      },
      [LoginType.PASSWORD]: {
        login: passwordSubmit,
        component: <PasswordComponent />
      },
      [LoginType.WeChat]: {
        login: wechatSubmit,
        component: <WechatComponent />
      },
      [LoginType.NONE]: null
    };
  }, [
    PasswordComponent,
    SmsModal,
    WechatComponent,
    passwordSubmit,
    smsSubmit,
    wechatSubmit,
    turnstileRef.current
  ]);

  useEffect(() => {
    setTabIndex(needPhone ? LoginType.SMS : needPassword ? LoginType.PASSWORD : LoginType.NONE);
  }, [needPassword, needPhone]);

  const LoginComponent = useMemo(
    () => (tabIndex !== LoginType.NONE ? loginConfig[tabIndex].component : null),
    [loginConfig, tabIndex]
  );

  const isAgreeCb = () => {
    if (isAgree) {
      return true;
    } else {
      setIsInvalid(true);
      showError(t('common:read_and_agree'));
      return false;
    }
  };
  const handleLogin = debounce(() => {
    const selectedConfig = loginConfig[tabIndex];
    if (!isAgreeCb() || !selectedConfig) return;
    selectedConfig.login();
  }, 500);
  const bg = useColorModeValue('white', 'gray.700');
  const color = useColorModeValue('gray.700', 'white');
  return (
    <Flex minH="100vh" align="center" justify="center" bg={bg}>
      <Stack spacing={8} mx="auto" maxW="lg" px={4}>
        <Stack align="center">
          <Heading fontSize="4xl" mb={2} color={color}>
            Welcome Back
          </Heading>
          <Text color="gray.500">To continue, please sign in or sign up.</Text>
        </Stack>
        <Box rounded="lg" bg={bg} shadow="lg" p={8}>
          <Stack spacing={4}>
            {/* Sign in / Sign up toggle */}
            <Flex justify="space-between" mb={4}>
              <Button variant="outline" onClick={() => alert('Sign in')} w="48%">
                Sign in
              </Button>
              <Button variant="solid" onClick={() => alert('Sign up')} w="48%">
                Sign up
              </Button>
            </Flex>

            {/* Email Address */}
            <Input
              type="email"
              placeholder="Email"
              variant="filled"
              _focus={{ borderColor: 'blue.500' }}
            />

            {/* Password */}
            <Input
              type="password"
              placeholder="Password"
              variant="filled"
              _focus={{ borderColor: 'blue.500' }}
            />

            {/* Forgot Password Link */}
            <Link color="blue.500" alignSelf="flex-end" onClick={() => alert('Forgot password')}>
              Forgot password?
            </Link>

            {/* Remember Me Checkbox */}
            <Checkbox colorScheme="blue">Remember Me</Checkbox>

            {/* Sign in Button */}
            <Button
              variant="solid"
              colorScheme="blue"
              isLoading={false}
              onClick={() => alert('Sign in')}
            >
              Sign in
            </Button>

            {/* OR Divider */}
            <Text align="center" fontSize="sm" color="gray.500">
              OR Sign in with
            </Text>

            {/* Social Login Buttons */}
            <Stack direction="row" spacing={4}>
              <Button variant="outline" onClick={() => alert('Sign in with Google')}>
                Google
              </Button>
              <Button variant="outline" onClick={() => alert('Sign in with GitHub')}>
                Github
              </Button>
            </Stack>

            {/* Terms and Conditions */}
            <Text fontSize="sm" color="gray.500">
              By proceeding you acknowledge that you have read, understood and agree to our
              <Link color="blue.500" href="/terms">
                Terms and Conditions
              </Link>
              , and
              <Link color="blue.500" href="/privacy">
                Privacy Policy
              </Link>
              .
            </Text>
          </Stack>
        </Box>
      </Stack>
    </Flex>
  );
}
