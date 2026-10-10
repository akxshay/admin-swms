import React, { useState, useEffect, useRef } from 'react';
import { Phone, ArrowRight, ShieldCheck, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PhoneInput } from '../components/ui/Input';
import { api, setActiveUserId } from '../lib/api';
import { useToast } from '../components/ui/Toast';

interface AuthPageProps {
  onSuccess: (userId: string, needsOnboarding: boolean) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const { toast, success, error } = useToast();
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phone, setPhone] = useState<string>('9876543210');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '']);
  const [demoCode, setDemoCode] = useState<string>('1234');
  const [loading, setLoading] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(30);
  const [canResend, setCanResend] = useState<boolean>(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'OTP' && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (phone.length < 10) {
      error('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await api.requestOtp(phone);
      if (res.success) {
        if (res.demoCode) setDemoCode(res.demoCode);
        setStep('OTP');
        setCountdown(30);
        setCanResend(false);
        success('Verification OTP Sent', `Code sent to +91 ${phone}`);
        // Focus first OTP digit
        setTimeout(() => inputRefs[0].current?.focus(), 150);
      }
    } catch (err: any) {
      error('Failed to send OTP', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto-advance to next box
    if (digit && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // If all 4 filled, trigger verify automatically
    const fullCode = newDigits.join('');
    if (fullCode.length === 4) {
      handleVerifyOtp(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      const arr = pasted.split('');
      setOtpDigits(arr);
      handleVerifyOtp(pasted);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    if (code.length !== 4) {
      error('Please enter 4 digits');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyOtp(phone, code);
      if (res.success && res.userId) {
        setActiveUserId(res.userId);
        success('Phone Verified!', `Welcome back ${res.profile?.name || 'Citizen'}`);
        onSuccess(res.userId, res.needsOnboarding);
      }
    } catch (err: any) {
      error('Verification Failed', err.message);
      setOtpDigits(['', '', '', '']);
      inputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const useDemoCodeQuickly = () => {
    const digits = demoCode.split('');
    setOtpDigits(digits);
    handleVerifyOtp(demoCode);
  };

  return (
    <div className="min-h-screen bg-[#F0EDE6] flex flex-col justify-center items-center px-4 py-8 antialiased">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#3E8E41] to-[#8BC83F] flex items-center justify-center text-3xl shadow-xl mx-auto mb-4 border-2 border-white">
          🌱
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[#16181D] tracking-tight">
          SWMS Portal
        </h1>
        <p className="text-sm font-semibold text-[#6B7280] mt-1 max-w-sm mx-auto">
          Doorstep Recyclable Waste Management & Eco Rewards • Swachh Bharat Mission
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#E6E1D6] p-6 sm:p-8 shadow-xl">
        {step === 'PHONE' ? (
          <form onSubmit={handleRequestOtp} className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-[#16181D]">Enter Mobile Number</h2>
              <p className="text-xs text-[#6B7280] mt-1">
                We will send an instant 4-digit verification code to your phone.
              </p>
            </div>

            <PhoneInput
              value={phone}
              onChange={setPhone}
              label="10-Digit Mobile Number"
              disabled={loading}
            />

            {/* Dev helper chip */}
            <div className="p-3 bg-[#E8F5D8] rounded-2xl border border-[#8BC83F]/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#2E7031] font-bold">
                <Sparkles className="w-4 h-4 text-[#8BC83F]" />
                <span>Dev / Demo account ready</span>
              </div>
              <span className="font-mono bg-white px-2 py-0.5 rounded-lg border text-[#16181D]">
                9876543210
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full font-black text-base shadow-lg"
            >
              <span>Get Verification OTP</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-[#6B7280] pt-2">
              <ShieldCheck className="w-4 h-4 text-[#3E8E41]" />
              <span>100% Secure • Compliant with India DPDP Act</span>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-[#16181D]">Verify OTP</h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Sent to <span className="font-bold text-[#16181D]">+91 {phone}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep('PHONE')}
                className="text-xs font-bold text-[#3E8E41] hover:underline"
              >
                Edit Number
              </button>
            </div>

            {/* Clearly marked Demo Code Chip */}
            <div className="p-3 bg-[#E8F5D8] rounded-2xl border border-[#3E8E41]/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">🧪</span>
                <div>
                  <span className="text-xs font-bold text-[#2E7031] block">Development Demo Code:</span>
                  <span className="text-xs text-[#6B7280]">Click to auto-fill code</span>
                </div>
              </div>
              <button
                type="button"
                onClick={useDemoCodeQuickly}
                className="bg-white border border-[#3E8E41] text-[#2E7031] font-mono font-black text-sm px-3 py-1 rounded-xl hover:bg-[#3E8E41] hover:text-white transition-colors cursor-pointer"
              >
                {demoCode}
              </button>
            </div>

            {/* 4-digit PIN Boxes */}
            <div className="flex justify-center gap-3 sm:gap-4 my-4" onPaste={handlePaste}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={inputRefs[idx]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  autoComplete="one-time-code"
                  className="w-14 h-16 text-center text-2xl font-black text-[#16181D] bg-white border-2 border-[#E6E1D6] rounded-2xl focus:border-[#3E8E41] focus:ring-4 focus:ring-[#8BC83F]/20 focus:outline-none transition-all shadow-sm"
                />
              ))}
            </div>

            <Button
              type="button"
              onClick={() => handleVerifyOtp()}
              variant="accent"
              size="lg"
              loading={loading}
              className="w-full text-base font-black shadow-lg"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              <span>Verify & Continue</span>
            </Button>

            {/* Resend OTP Bar */}
            <div className="flex items-center justify-between text-xs text-[#6B7280] pt-2">
              <span>Didn’t receive code?</span>
              {canResend ? (
                <button
                  type="button"
                  onClick={() => handleRequestOtp()}
                  className="font-bold text-[#3E8E41] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resend OTP</span>
                </button>
              ) : (
                <span className="font-semibold text-gray-400">
                  Resend in <span className="font-mono text-[#16181D]">{countdown}s</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <p className="text-xs text-[#6B7280] mt-8 text-center max-w-sm">
        By continuing, you agree to SWMS Clean City Terms of Service and Privacy Policy. Doorstep service in Mangaluru & Dakshina Kannada.
      </p>
    </div>
  );
};
