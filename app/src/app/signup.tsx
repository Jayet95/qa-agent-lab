import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Field, Screen, Title } from '../components/ui';
import { isValidEmail, passwordProblem } from '../lib/validation';
import { useApp } from '../state/AppContext';

interface Errors {
  name?: string | null;
  email?: string | null;
  password?: string | null;
}

export default function SignUp() {
  const { signUp, hasBug } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const validate = {
    name: (v: string) => (v.trim().length < 2 ? 'Enter your full name' : null),
    email: (v: string) => (isValidEmail(v, hasBug('email-validation')) ? null : 'Enter a valid email address'),
    password: (v: string) => passwordProblem(v),
  };

  // Once a field shows an error, re-check it as the user types so the
  // message disappears as soon as the value is fixed.
  const change = (field: keyof Errors, set: (v: string) => void) => (v: string) => {
    set(v);
    if (errors[field]) setErrors((e) => ({ ...e, [field]: validate[field](v) }));
  };

  const submit = () => {
    const next: Errors = {
      name: validate.name(name),
      email: validate.email(email),
      password: validate.password(password),
    };
    setErrors(next);
    if (next.name || next.email || next.password) return;
    signUp({ name: name.trim(), email: email.trim() });
    router.replace('/verify');
  };

  return (
    <Screen>
      <Title sub="It takes less than a minute.">Create your account</Title>
      <Field
        testID="signup-name"
        label="Full name"
        value={name}
        onChangeText={change('name', setName)}
        placeholder="Dana Levi"
        autoComplete="name"
        error={errors.name}
      />
      <Field
        testID="signup-email"
        label="Email"
        value={email}
        onChangeText={change('email', setEmail)}
        placeholder="dana@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={errors.email}
      />
      <Field
        testID="signup-password"
        label="Password"
        value={password}
        onChangeText={change('password', setPassword)}
        placeholder="At least 8 characters, incl. a number"
        secureTextEntry
        error={errors.password}
      />
      <Button testID="signup-submit" label="Create account" onPress={submit} />
    </Screen>
  );
}
