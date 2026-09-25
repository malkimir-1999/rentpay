'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Form, Input, InputNumber, Select, Steps } from 'antd';
import { CheckCircleFilled, ArrowRightOutlined } from '@ant-design/icons';
import { countries, type CountryCode } from '../../../../../packages/config/src/countries';
import { apiPath } from '../../../lib/api-client';
import styles from '../../marketing.module.css';
import localStyles from './onboarding.module.css';

type Setup = {
  business: { id: string; name: string; slug: string; phone: string | null; email: string | null; address: string | null; country: CountryCode };
  settings: { timezone: string; currency: string; onboardingStep: number; onboardingCompletedAt: string | null; depositRequired: boolean; defaultDepositMinor: number; lateReturnGraceMinutes: number; lateReturnFeeMinor: number; bookingMode: string; enabledRentalPaymentMethods: string[]; publicBrandColor: string };
  locations: { id: string; name: string; timezone: string; address: string | null; phone: string | null }[];
  vehicle: { id: string; make: string; model: string; year: number | null; registrationNumber: string; dailyRateMinor: number; weeklyRateMinor: number | null; monthlyRateMinor: number | null; depositMinor: number; currency: string } | null;
};
type Props = { token: string; initialSetup: Setup };
type FormValues = Record<string, string | number | boolean | string[] | null | undefined>;
const steps = ['Welcome', 'Your business', 'Pickup location', 'First vehicle', 'Pricing', 'Rental basics', 'Payment methods', 'Booking page'];
const paymentChoices = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'EASYPAISA', label: 'Easypaisa' },
  { value: 'JAZZCASH', label: 'JazzCash' },
];
const amount = (value: number | null | undefined) => value ? value / 100 : undefined;

export function OnboardingForm({ token, initialSetup }: Props) {
  const [setup, setSetup] = useState(initialSetup);
  const [step, setStep] = useState(Math.min(initialSetup.settings.onboardingStep, 8));
  const [country, setCountry] = useState<CountryCode>(initialSetup.business.country in countries ? initialSetup.business.country : 'PK');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const [profile, setProfile] = useState({ name: setup.business.name, email: setup.business.email ?? '', phone: setup.business.phone ?? '', address: setup.business.address ?? '', country: setup.business.country });
  const [location, setLocation] = useState({ name: setup.locations[0]?.name ?? 'Main location', address: setup.locations[0]?.address ?? '', phone: setup.locations[0]?.phone ?? '', timezone: setup.locations[0]?.timezone ?? setup.settings.timezone });
  const [vehicle, setVehicle] = useState({ make: setup.vehicle?.make ?? '', model: setup.vehicle?.model ?? '', year: setup.vehicle?.year ?? undefined, registrationNumber: setup.vehicle?.registrationNumber ?? '', daily: amount(setup.vehicle?.dailyRateMinor), weekly: amount(setup.vehicle?.weeklyRateMinor), monthly: amount(setup.vehicle?.monthlyRateMinor), deposit: amount(setup.vehicle?.depositMinor) });
  const [basics, setBasics] = useState({ depositRequired: setup.settings.depositRequired, lateReturnGraceMinutes: setup.settings.lateReturnGraceMinutes, lateReturnFee: amount(setup.settings.lateReturnFeeMinor), methods: setup.settings.enabledRentalPaymentMethods });
  const [booking, setBooking] = useState({ slug: setup.business.slug, color: setup.settings.publicBrandColor });

  useEffect(() => setCountry(setup.business.country in countries ? setup.business.country : 'PK'), [setup.business.country]);

  async function apiRequest(path: string, method: string, body?: unknown) {
    const response = await fetch(apiPath(`/api/business/onboarding/${path}`), { method, headers, ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store' });
    if (!response.ok) {
      const result = await response.json().catch(() => null) as { error?: { message?: string | string[] } } | null;
      const detail = result?.error?.message;
      throw new Error(Array.isArray(detail) ? detail[0] : detail ?? 'We could not save this step. Your information is still here—please try again.');
    }
    return response.status === 204 ? null : response.json();
  }

  function captureDraft(values: FormValues) {
    if (step === 1) {
      setProfile((current) => ({ ...current, ...values } as typeof current));
      if (typeof values.country === 'string' && values.country in countries) setCountry(values.country as CountryCode);
    }
    if (step === 2) setLocation((current) => ({ ...current, ...values } as typeof current));
    if (step === 3) setVehicle((current) => ({ ...current, ...values } as typeof current));
    if (step === 5 || step === 6) setBasics((current) => ({ ...current, ...values } as typeof current));
    if (step === 7) setBooking((current) => ({ ...current, ...values } as typeof current));
  }

  async function persistStep(nextStep: number, complete = false, submitted?: FormValues) {
    setBusy(true);
    setError('');
    try {
      const values = submitted ?? {};
      if (step === 1) {
        const data = { ...profile, ...values };
        const selectedCountry = typeof data.country === 'string' && data.country in countries ? data.country as CountryCode : country;
        await apiRequest('profile', 'PATCH', { name: data.name, email: data.email || undefined, phone: data.phone || undefined, address: data.address || undefined, country: selectedCountry });
        await apiRequest('settings', 'PATCH', { country: selectedCountry, currency: countries[selectedCountry].currency, timezone: countries[selectedCountry].timezone });
      }
      if (step === 2) {
        const data = { ...location, ...values };
        await apiRequest('locations', 'POST', { ...data, timezone: data.timezone || countries[country].timezone });
      }
      if (step === 3) {
        const data = { ...vehicle, ...values };
        if (String(data.registrationNumber ?? '').trim()) await apiRequest('vehicle', 'POST', {
          make: data.make,
          model: data.model,
          ...(data.year ? { year: Number(data.year) } : {}),
          registrationNumber: String(data.registrationNumber).trim(),
          dailyRateMinor: Math.round(Number(data.daily ?? 0) * 100),
          ...(data.weekly ? { weeklyRateMinor: Math.round(Number(data.weekly) * 100) } : {}),
          ...(data.monthly ? { monthlyRateMinor: Math.round(Number(data.monthly) * 100) } : {}),
          depositMinor: Math.round(Number(data.deposit ?? 0) * 100),
          ...(setup.locations[0]?.id ? { locationId: setup.locations[0].id } : {}),
        });
      }
      if (step === 4 && setup.vehicle) {
        const data = { ...vehicle, ...values };
        await apiRequest('vehicle', 'POST', {
          make: data.make, model: data.model,
          ...(data.year ? { year: Number(data.year) } : {}),
          registrationNumber: String(data.registrationNumber).trim(),
          dailyRateMinor: Math.round(Number(data.daily ?? 0) * 100),
          ...(data.weekly ? { weeklyRateMinor: Math.round(Number(data.weekly) * 100) } : {}),
          ...(data.monthly ? { monthlyRateMinor: Math.round(Number(data.monthly) * 100) } : {}),
          depositMinor: Math.round(Number(data.deposit ?? 0) * 100),
          ...(setup.locations[0]?.id ? { locationId: setup.locations[0].id } : {}),
        });
      }
      if (step === 5) {
        const data = { ...basics, ...values };
        await apiRequest('settings', 'PATCH', { depositRequired: Boolean(data.depositRequired), defaultDepositMinor: setup.vehicle?.depositMinor ?? 0, lateReturnGraceMinutes: Number(data.lateReturnGraceMinutes), lateReturnFeeMinor: Math.round(Number(data.lateReturnFee ?? 0) * 100), bookingMode: 'REQUEST_TO_BOOK' });
      }
      if (step === 6) await apiRequest('settings', 'PATCH', { enabledRentalPaymentMethods: submitted?.methods ?? basics.methods });
      if (step === 7) {
        const data = { ...booking, ...values };
        await apiRequest('profile', 'PATCH', { slug: String(data.slug ?? '').trim().toLowerCase() });
        await apiRequest('settings', 'PATCH', { publicBrandColor: data.color });
      }
      await apiRequest('progress', 'PATCH', { step: nextStep, ...(complete ? { completed: true } : {}) });
      const fresh = await apiRequest('', 'GET') as Setup;
      setSetup(fresh);
      if (complete) setStep(8); else setStep(nextStep);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not save this step. Please try again.');
      return false;
    } finally { setBusy(false); }
  }

  async function saveAndExit() {
    if (await persistStep(step)) window.location.assign('/app/today');
  }

  async function skipVehicle() {
    setBusy(true);
    setError('');
    try {
      await apiRequest('progress', 'PATCH', { step: 4 });
      const fresh = await apiRequest('', 'GET') as Setup;
      setSetup(fresh);
      setStep(4);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not save your progress. Please try again.');
    } finally { setBusy(false); }
  }

  async function skipPricing() {
    setBusy(true);
    setError('');
    try {
      await apiRequest('progress', 'PATCH', { step: 5 });
      setStep(5);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not save your progress. Please try again.');
    } finally { setBusy(false); }
  }

  const initialValues: Record<string, unknown> = step === 1
    ? { ...profile, country }
    : step === 2
      ? { ...location, timezone: location.timezone || countries[country].timezone }
      : step === 3
        ? vehicle
      : step === 4
        ? vehicle
      : step === 5
          ? basics
          : step === 6
            ? basics
            : booking;

  return <main className={localStyles.page}>
    <header className={localStyles.topbar}><Link className={styles.brand} href="/"><span className={styles.brandMark}>R</span><span>RentPay</span></Link>{step < 8 && <Button className={localStyles.saveExit} htmlType="button" onClick={saveAndExit} loading={busy}>Save for later</Button>}</header>
    <section className={localStyles.workspace}>
      <div className={localStyles.progressArea}><span className={styles.eyebrow}>Business setup</span><h1>Let’s get your rental workspace ready.</h1><p>Just the essentials. You can change these details later in settings.</p><Steps className={localStyles.progress} aria-label={`Business setup, step ${Math.min(step + 1, 8)} of 8: ${steps[Math.min(step, 7)]}`} titlePlacement="vertical" current={Math.min(step, 7)} responsive items={steps.map((title) => ({ title }))} /></div>
      <Card className={localStyles.card} variant="borderless">
        {step === 0 ? <div className={localStyles.welcome}>
          <span className={styles.eyebrow}>Start here</span><h2 id="step-title">Bring your rental basics into one clear workspace.</h2><p>We’ll guide you through your business details, pickup location, starter vehicle and prices, customer payment options, and booking page.</p>
          <ul><li>Your changes are saved as you move through setup.</li><li>You can skip adding a vehicle and finish that later.</li><li>Everything can be updated from your business settings.</li></ul>
          {error && <Alert className={localStyles.formAlert} type="error" showIcon title={error} role="alert" />}
          <Button className={localStyles.nextButton} type="primary" loading={busy} onClick={() => persistStep(1)}>Start business setup <ArrowRightOutlined aria-hidden="true" /></Button>
        </div> : step < 8 ? <>
          <span className={styles.eyebrow}>Step {step} of 8{step === 3 || step === 4 ? ' · Optional' : ''}</span>
          <h2 id="step-title">{['Tell us about your business', 'Add your first location', 'Add your first vehicle', 'Set your starting prices', 'Set rental basics', 'Choose payment methods', 'Set up your booking page'][step - 1]}</h2>
          <p>{['These details help customers recognize and contact your rental team.', 'Use the place where vehicles are usually picked up. You can add more locations later.', 'A few identifying details are enough. You can skip this and add vehicles later.', 'Set a daily rate and optional longer-stay prices. You can adjust them at any time.', 'Choose a simple deposit and late-return policy. Booking requests stay in your control.', 'Choose how customers can pay your business. You can update this later.', 'Choose a short web address customers can remember. Your page will show your business details and vehicles.'][step - 1]}</p>
          <Form key={step} className={localStyles.stepForm} layout="vertical" requiredMark={false} initialValues={initialValues} onValuesChange={(_, values: FormValues) => captureDraft(values)} onFinish={(values: FormValues) => persistStep(step + 1, step === 7, values)}>
            {step === 1 && <div className={localStyles.fields}>
              <Form.Item className={localStyles.field} label="Business name" name="name" rules={[{ required: true, whitespace: true, message: 'Enter your business name.' }, { min: 2, max: 100, message: 'Use 2 to 100 characters.' }]}><Input autoComplete="organization" /></Form.Item>
              <Form.Item className={localStyles.field} label="Business email" name="email" rules={[{ type: 'email', message: 'Enter a valid email address.' }]}><Input type="email" autoComplete="email" /></Form.Item>
              <Form.Item className={localStyles.field} label="Phone" name="phone"><Input type="tel" autoComplete="tel" /></Form.Item>
              <Form.Item className={localStyles.field} label="Country" name="country" rules={[{ required: true, message: 'Choose your country.' }]}><Select options={Object.entries(countries).map(([code, item]) => ({ value: code, label: item.name }))} /></Form.Item>
              <Form.Item className={`${localStyles.field} ${localStyles.full}`} label={<span>Business address <span className={styles.optionalLabel}>optional</span></span>} name="address"><Input autoComplete="street-address" /></Form.Item>
              <Alert className={localStyles.full} type="info" showIcon={false} title={`We’ll use ${countries[country].currency} and ${countries[country].timezone} as your starting defaults.`} />
            </div>}
            {step === 2 && <div className={localStyles.fields}>
              <Form.Item className={localStyles.field} label="Location name" name="name" rules={[{ required: true, whitespace: true, message: 'Give this pickup location a name.' }, { min: 2, max: 100 }]}><Input /></Form.Item>
              <Form.Item className={localStyles.field} label={<span>Contact phone <span className={styles.optionalLabel}>optional</span></span>} name="phone"><Input type="tel" autoComplete="tel" /></Form.Item>
              <Form.Item className={`${localStyles.field} ${localStyles.full}`} label="Pickup address" name="address" rules={[{ required: true, whitespace: true, message: 'Enter where customers collect the vehicle.' }]}><Input autoComplete="street-address" /></Form.Item>
              <Form.Item className={localStyles.field} label="Time zone" name="timezone" rules={[{ required: true, message: 'Add your local time zone.' }]}><Input /></Form.Item>
            </div>}
            {step === 3 && <>
              <div className={localStyles.fields}>
                <Form.Item className={localStyles.field} label="Make" name="make" rules={[{ required: true, whitespace: true, message: 'Enter the vehicle make.' }, { max: 60 }]}><Input autoComplete="off" /></Form.Item>
                <Form.Item className={localStyles.field} label="Model" name="model" rules={[{ required: true, whitespace: true, message: 'Enter the vehicle model.' }, { max: 60 }]}><Input /></Form.Item>
                <Form.Item className={localStyles.field} label={<span>Year <span className={styles.optionalLabel}>optional</span></span>} name="year" rules={[{ type: 'number', min: 1950, max: 2100, message: 'Enter a year between 1950 and 2100.' }]}><InputNumber min={1950} max={2100} precision={0} className={localStyles.fullWidth} /></Form.Item>
                <Form.Item className={localStyles.field} label="Registration number" name="registrationNumber" rules={[{ required: true, whitespace: true, message: 'Enter the vehicle registration.' }, { max: 24 }]}><Input autoComplete="off" /></Form.Item>
              </div>
            </>}
            {step === 4 && setup.vehicle && <div className={localStyles.fields}>
              <Form.Item className={localStyles.field} label={`Daily rate (${countries[country].currency})`} name="daily" rules={[{ required: true, type: 'number', min: 0, message: 'Enter a daily rate. Use 0 if you will set pricing later.' }]}><InputNumber min={0} precision={0} className={localStyles.fullWidth} /></Form.Item>
              <Form.Item className={localStyles.field} label={<span>Weekly rate <span className={styles.optionalLabel}>optional</span> ({countries[country].currency})</span>} name="weekly"><InputNumber min={0} precision={0} className={localStyles.fullWidth} /></Form.Item>
              <Form.Item className={localStyles.field} label={<span>Monthly rate <span className={styles.optionalLabel}>optional</span> ({countries[country].currency})</span>} name="monthly"><InputNumber min={0} precision={0} className={localStyles.fullWidth} /></Form.Item>
              <Form.Item className={localStyles.field} label={<span>Security deposit <span className={styles.optionalLabel}>optional</span> ({countries[country].currency})</span>} name="deposit"><InputNumber min={0} precision={0} className={localStyles.fullWidth} /></Form.Item>
            </div>}
            {step === 4 && !setup.vehicle && <Alert className={localStyles.full} type="info" showIcon title="You skipped adding a vehicle. You can add it, including its prices, later from your workspace." />}
            {step === 5 && <div className={localStyles.fields}>
              <Form.Item className={localStyles.full} name="depositRequired" valuePropName="checked"><Checkbox>We usually collect a security deposit</Checkbox></Form.Item>
              <Form.Item className={localStyles.field} label="Late return grace period (minutes)" name="lateReturnGraceMinutes" rules={[{ required: true, type: 'number', min: 0, message: 'Enter 0 or more minutes.' }]}><InputNumber min={0} precision={0} className={localStyles.fullWidth} /></Form.Item>
              <Form.Item className={localStyles.field} label={<span>Late return fee <span className={styles.optionalLabel}>optional</span> ({countries[country].currency})</span>} name="lateReturnFee"><InputNumber min={0} precision={0} className={localStyles.fullWidth} /></Form.Item>
              <Alert className={localStyles.full} type="info" showIcon title="Booking requests start in review. Your team confirms availability before a reservation is final." />
            </div>}
            {step === 6 && <div className={localStyles.fields}>
              <Form.Item className={`${localStyles.full} ${localStyles.paymentChoices}`} label="Which payment methods do you accept?" name="methods" rules={[{ type: 'array', min: 1, message: 'Choose at least one payment method.' }]}><Checkbox.Group options={paymentChoices} /></Form.Item>
              <Alert className={localStyles.full} type="info" showIcon title="These are the ways your rental customers can pay. SaaS subscription payments are managed separately." />
            </div>}
            {step === 7 && <div className={localStyles.fields}>
              <Form.Item className={`${localStyles.field} ${localStyles.full}`} label="Your RentPay web address" name="slug" rules={[{ required: true, message: 'Choose a short web address.' }, { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: 'Use lowercase letters, numbers and single hyphens.' }, { max: 60 }]}><Input addonBefore="/rentals/" autoComplete="off" /></Form.Item>
              <Form.Item className={localStyles.field} label="Brand color" name="color" rules={[{ required: true, pattern: /^#[0-9A-Fa-f]{6}$/, message: 'Choose a valid color.' }]}><Input type="color" className={localStyles.colorInput} /></Form.Item>
              <div className={localStyles.previewNote}><strong>Booking style: Request to book</strong><span>Customers can see your vehicles and ask about dates. Your team stays in control of confirming each request.</span><Link href={`/rentals/${booking.slug}`} target="_blank">Preview your page <ArrowRightOutlined aria-hidden="true" /></Link></div>
            </div>}
            {error && <Alert className={localStyles.formAlert} type="error" showIcon title={error} role="alert" />}
            <div className={localStyles.actions}>{step > 1 && <Button htmlType="button" className={localStyles.backButton} onClick={() => persistStep(step - 1)}>Back</Button>}{step === 3 && <Button type="link" htmlType="button" onClick={skipVehicle} disabled={busy}>Skip this step</Button>}{step === 4 && !setup.vehicle && <Button type="link" htmlType="button" onClick={skipPricing} disabled={busy}>Continue without pricing</Button>}{(step !== 4 || Boolean(setup.vehicle)) && <Button className={localStyles.nextButton} type="primary" htmlType="submit" loading={busy}>{step === 7 ? 'Finish setup' : 'Save and continue'} <ArrowRightOutlined aria-hidden="true" /></Button>}</div>
          </Form>
        </> : <div className={localStyles.complete}>
          <span className={localStyles.completeIcon}><CheckCircleFilled aria-hidden="true" /></span><span className={styles.eyebrow}>Setup complete</span><h2 id="step-title">Your rental workspace is ready.</h2><p>Your 30-day trial is underway. You can add more vehicles and details whenever you’re ready.</p>
          <div className={localStyles.completeActions}><Link className={styles.button} href="/app/today">Go to dashboard <ArrowRightOutlined aria-hidden="true" /></Link><Link className={styles.secondaryButton} href={`/rentals/${setup.business.slug}`} target="_blank">View your booking page</Link></div>
        </div>}
      </Card>
      {error && step === 8 && <Alert type="error" showIcon title={error} role="alert" />}
      <p className={localStyles.privacyNote}>Your business information stays in your private workspace. <Link href="/legal/privacy">Read how we handle data</Link>.</p>
    </section>
  </main>;
}
