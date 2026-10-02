import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
  confirmPassword?: string;
  showMatchStatus?: boolean;
}

export const getPasswordStrength = (pass: string): {
  score: number; // 0 to 4
  label: 'Very Weak' | 'Weak' | 'Medium' | 'Strong';
  barColor: string;
  percent: number;
} => {
  if (!pass) return { score: 0, label: 'Very Weak', barColor: 'bg-slate-200', percent: 0 };

  let score = 0;
  if (pass.length >= 8) score++;
  if (pass.length >= 12) score++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
  if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;

  if (score <= 1) {
    return { score: 1, label: 'Weak', barColor: 'bg-rose-500', percent: 25 };
  } else if (score === 2) {
    return { score: 2, label: 'Medium', barColor: 'bg-amber-500', percent: 50 };
  } else if (score === 3) {
    return { score: 3, label: 'Medium', barColor: 'bg-emerald-400', percent: 75 };
  } else {
    return { score: 4, label: 'Strong', barColor: 'bg-emerald-600', percent: 100 };
  }
};

export const PasswordStrengthIndicator: React.FC<PasswordStrengthProps> = ({
  password,
  confirmPassword,
  showMatchStatus = false,
}) => {
  const strength = getPasswordStrength(password);
  const hasMinLength = password.length >= 8;
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbersOrSpecial = /[0-9]|[^A-Za-z0-9]/.test(password);
  const passwordsMatch = confirmPassword !== undefined && confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword !== undefined && confirmPassword.length > 0 && password !== confirmPassword;

  if (!password && !confirmPassword) return null;

  return (
    <div className="space-y-2 mt-2 pt-1 border-t border-slate-100 text-xs">
      {/* Strength Bar */}
      <div>
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-slate-500">Password strength:</span>
          <span className={`font-semibold ${
            strength.label === 'Strong' ? 'text-emerald-600' :
            strength.label === 'Medium' ? 'text-amber-600' : 'text-rose-600'
          }`}>
            {strength.label}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${strength.barColor}`}
            style={{ width: `${strength.percent}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-500 pt-0.5">
        <div className="flex items-center gap-1.5">
          {hasMinLength ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          )}
          <span className={hasMinLength ? 'text-slate-700' : 'text-slate-400'}>
            At least 8 characters
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {hasLetters && hasNumbersOrSpecial ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          )}
          <span className={hasLetters && hasNumbersOrSpecial ? 'text-slate-700' : 'text-slate-400'}>
            Letters & numbers/symbols
          </span>
        </div>

        {showMatchStatus && confirmPassword !== undefined && (
          <div className="sm:col-span-2 flex items-center gap-1.5 pt-0.5">
            {passwordsMatch ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-emerald-700 font-medium">Passwords match</span>
              </>
            ) : passwordsMismatch ? (
              <>
                <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="text-rose-600 font-medium">Passwords do not match</span>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
