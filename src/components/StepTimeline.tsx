import type { BookingStatus } from '../types';

interface Step {
  key: BookingStatus | 'inquiry_submitted';
  label: string;
}

const STEPS: Step[] = [
  { key: 'inquiry_sent', label: 'Inquiry Sent' },
  { key: 'inquiry_submitted', label: 'Awaiting Response' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'agreement_sent', label: 'Agreement Sent' },
  { key: 'signed', label: 'Signed' },
  { key: 'deposit_paid', label: 'Deposit Paid' },
  { key: 'completed', label: 'Completed' },
];

const STATUS_ORDER: BookingStatus[] = [
  'inquiry_sent',
  'inquiry_submitted',
  'confirmed',
  'agreement_sent',
  'signed',
  'deposit_paid',
  'completed',
];

function getStepIndex(status: BookingStatus): number {
  return STATUS_ORDER.indexOf(status);
}

interface StepTimelineProps {
  status: BookingStatus;
}

export default function StepTimeline({ status }: StepTimelineProps) {
  const currentIndex = getStepIndex(status);
  const isCancelled = status === 'cancelled';

  return (
    <div className="w-full">
      {isCancelled ? (
        <div
          className="text-center py-3 px-4 rounded-lg text-sm font-semibold"
          style={{
            color: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
          }}
        >
          Booking Cancelled
        </div>
      ) : (
        <div className="relative">
          {/* Mobile: vertical layout */}
          <div className="flex flex-col gap-0 md:hidden">
            {STEPS.map((step, idx) => {
              const isCompleted = idx < currentIndex;
              const isCurrent = idx === currentIndex;
              const isFuture = idx > currentIndex;

              return (
                <div key={step.key} className="flex items-start gap-3">
                  {/* Line + dot column */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 z-10"
                      style={{
                        backgroundColor: isCompleted
                          ? '#22c55e'
                          : isCurrent
                            ? '#3b82f6'
                            : 'rgba(255,255,255,0.08)',
                        border: isCurrent ? '2px solid #3b82f6' : '2px solid transparent',
                        color: isCompleted || isCurrent ? '#fff' : 'rgba(255,255,255,0.3)',
                        boxShadow: isCurrent ? '0 0 0 4px rgba(59,130,246,0.2)' : 'none',
                      }}
                    >
                      {isCompleted ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path
                            d="M2.5 7L5.5 10L11.5 4"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div
                        className="w-0.5 flex-1 my-1"
                        style={{
                          minHeight: '20px',
                          backgroundColor: isCompleted
                            ? '#22c55e'
                            : 'rgba(255,255,255,0.08)',
                        }}
                      />
                    )}
                  </div>
                  {/* Label */}
                  <div
                    className="py-1 pb-3 text-sm font-semibold"
                    style={{
                      color: isCompleted
                        ? '#22c55e'
                        : isCurrent
                          ? '#3b82f6'
                          : isFuture
                            ? 'rgba(255,255,255,0.3)'
                            : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: horizontal layout */}
          <div className="hidden md:flex items-center">
            {STEPS.map((step, idx) => {
              const isCompleted = idx < currentIndex;
              const isCurrent = idx === currentIndex;
              const isFuture = idx > currentIndex;

              return (
                <div
                  key={step.key}
                  className="flex flex-col items-center"
                  style={{ flex: idx < STEPS.length - 1 ? 1 : 0 }}
                >
                  <div className="flex items-center w-full">
                    {/* Dot */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 z-10"
                      style={{
                        backgroundColor: isCompleted
                          ? '#22c55e'
                          : isCurrent
                            ? '#3b82f6'
                            : 'rgba(255,255,255,0.08)',
                        border: isCurrent ? '2px solid #3b82f6' : '2px solid transparent',
                        color: isCompleted || isCurrent ? '#fff' : 'rgba(255,255,255,0.3)',
                        boxShadow: isCurrent ? '0 0 0 4px rgba(59,130,246,0.2)' : 'none',
                      }}
                    >
                      {isCompleted ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path
                            d="M2.5 7L5.5 10L11.5 4"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    {/* Connector line */}
                    {idx < STEPS.length - 1 && (
                      <div
                        className="flex-1 h-0.5 mx-1"
                        style={{
                          backgroundColor: isCompleted
                            ? '#22c55e'
                            : 'rgba(255,255,255,0.08)',
                        }}
                      />
                    )}
                  </div>
                  {/* Label */}
                  <div
                    className="mt-2 text-xs font-semibold text-center leading-tight"
                    style={{
                      maxWidth: '80px',
                      color: isCompleted
                        ? '#22c55e'
                        : isCurrent
                          ? '#3b82f6'
                          : isFuture
                            ? 'rgba(255,255,255,0.3)'
                            : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
