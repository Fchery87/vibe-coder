'use client';

import { useState, useEffect } from 'react';

interface Step {
  id: string;
  label: string;
  description: string;
  icon: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  duration?: number;
  logs?: string[];
}

interface ModelFeedbackLoopProps {
  isActive: boolean;
  currentStep?: string;
  onComplete?: () => void;
}

export default function ModelFeedbackLoop({ isActive, currentStep, onComplete }: ModelFeedbackLoopProps) {
  const [steps, setSteps] = useState<Step[]>([
    {
      id: 'plan',
      label: 'Planning',
      description: 'Analyzing requirements and planning code structure',
      icon: '🧠',
      status: 'pending',
      logs: []
    },
    {
      id: 'scaffold',
      label: 'Scaffolding',
      description: 'Creating project structure and initial files',
      icon: '🏗️',
      status: 'pending',
      logs: []
    },
    {
      id: 'build',
      label: 'Building',
      description: 'Generating code and implementing features',
      icon: '⚡',
      status: 'pending',
      logs: []
    },
    {
      id: 'validate',
      label: 'Validating',
      description: 'Testing and validating the generated code',
      icon: '✅',
      status: 'pending',
      logs: []
    }
  ]);

  const [startTime, setStartTime] = useState<Date | null>(null);
  const [currentLog, setCurrentLog] = useState('');

  useEffect(() => {
    if (isActive && !startTime) {
      setStartTime(new Date());
      // Start with planning phase
      updateStepStatus('plan', 'active');
      simulatePlanning();
    }
  }, [isActive]);

  useEffect(() => {
    if (currentStep) {
      // Update step based on current step from parent
      const stepIndex = steps.findIndex(s => s.id === currentStep);
      if (stepIndex !== -1) {
        updateStepStatus(currentStep, 'active');
      }
    }
  }, [currentStep]);

  const updateStepStatus = (stepId: string, status: Step['status'], logs?: string[]) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId
        ? { ...step, status, logs: logs || step.logs }
        : step
    ));
  };

  const simulatePlanning = () => {
    const planningLogs = [
      'Analyzing user prompt...',
      'Identifying project requirements...',
      'Determining technology stack...',
      'Planning component architecture...',
      'Estimating complexity and scope...'
    ];

    let logIndex = 0;
    const logInterval = setInterval(() => {
      if (logIndex < planningLogs.length) {
        setCurrentLog(planningLogs[logIndex]);
        updateStepStatus('plan', 'active', planningLogs.slice(0, logIndex + 1));
        logIndex++;
      } else {
        clearInterval(logInterval);
        updateStepStatus('plan', 'completed');
        setTimeout(() => {
          updateStepStatus('scaffold', 'active');
          simulateScaffolding();
        }, 1000);
      }
    }, 800);
  };

  const simulateScaffolding = () => {
    const scaffoldLogs = [
      'Creating project structure...',
      'Setting up configuration files...',
      'Initializing package dependencies...',
      'Creating base components...',
      'Setting up routing structure...'
    ];

    let logIndex = 0;
    const logInterval = setInterval(() => {
      if (logIndex < scaffoldLogs.length) {
        setCurrentLog(scaffoldLogs[logIndex]);
        updateStepStatus('scaffold', 'active', scaffoldLogs.slice(0, logIndex + 1));
        logIndex++;
      } else {
        clearInterval(logInterval);
        updateStepStatus('scaffold', 'completed');
        setTimeout(() => {
          updateStepStatus('build', 'active');
          simulateBuilding();
        }, 1000);
      }
    }, 600);
  };

  const simulateBuilding = () => {
    const buildLogs = [
      'Generating main application code...',
      'Implementing core functionality...',
      'Adding UI components...',
      'Integrating APIs and services...',
      'Optimizing performance...'
    ];

    let logIndex = 0;
    const logInterval = setInterval(() => {
      if (logIndex < buildLogs.length) {
        setCurrentLog(buildLogs[logIndex]);
        updateStepStatus('build', 'active', buildLogs.slice(0, logIndex + 1));
        logIndex++;
      } else {
        clearInterval(logInterval);
        updateStepStatus('build', 'completed');
        setTimeout(() => {
          updateStepStatus('validate', 'active');
          simulateValidation();
        }, 1000);
      }
    }, 1000);
  };

  const simulateValidation = () => {
    const validateLogs = [
      'Running syntax checks...',
      'Performing type checking...',
      'Executing unit tests...',
      'Validating functionality...',
      'Final quality assessment...'
    ];

    let logIndex = 0;
    const logInterval = setInterval(() => {
      if (logIndex < validateLogs.length) {
        setCurrentLog(validateLogs[logIndex]);
        updateStepStatus('validate', 'active', validateLogs.slice(0, logIndex + 1));
        logIndex++;
      } else {
        clearInterval(logInterval);
        updateStepStatus('validate', 'completed');
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 1000);
      }
    }, 700);
  };

  const getStepColor = (status: Step['status']) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'active': return 'text-blue-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-500';
    }
  };

  const getStepBgColor = (status: Step['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 border-green-400/30';
      case 'active': return 'bg-blue-500/20 border-blue-400/30 animate-pulse';
      case 'error': return 'bg-red-500/20 border-red-400/30';
      default: return 'bg-[var(--panel-muted-bg)] border-[var(--panel-muted-border)]';
    }
  };

  if (!isActive) return null;

  return (
    <div className="glass-panel rounded-lg p-6 mb-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
          🤖 AI Generation Process
        </h3>
        {startTime && (
          <div className="text-sm text-[var(--muted)]">
            Started {Math.floor((new Date().getTime() - startTime.getTime()) / 1000)}s ago
          </div>
        )}
      </div>

      {/* Progress Steps */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center">
            {/* Step Circle */}
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg mb-2 transition-all duration-300 ${getStepBgColor(step.status)}`}>
              {step.status === 'completed' ? '✓' :
               step.status === 'active' ? step.icon :
               step.status === 'error' ? '✗' :
               step.icon}
            </div>

            {/* Step Label */}
            <div className={`text-xs font-medium text-center ${getStepColor(step.status)}`}>
              {step.label}
            </div>

            {/* Connection Line */}
            {index < steps.length - 1 && (
              <div className={`absolute top-6 left-1/2 w-full h-0.5 -z-10 ${
                steps[index + 1].status === 'completed' ? 'bg-green-400' :
                steps[index].status === 'completed' ? 'bg-blue-400' :
                'bg-[var(--border)]'
              }`} style={{ width: 'calc(100% - 3rem)', left: '50%', transform: 'translateX(-50%)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Current Activity */}
      <div className="bg-[var(--panel-muted-bg)] rounded-lg p-4 border border-[var(--panel-muted-border)]">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-[var(--foreground)]">
            {steps.find(s => s.status === 'active')?.description || 'Processing...'}
          </span>
        </div>

        {currentLog && (
          <div className="text-sm text-[var(--muted)] font-mono">
            {currentLog}
          </div>
        )}

        {/* Step Logs */}
        {steps.filter(s => s.status !== 'pending' && s.logs && s.logs.length > 0).map(step => (
          <div key={step.id} className="mt-3">
            <div className="text-xs text-[var(--muted)] mb-1">{step.label} Logs:</div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {step.logs?.slice(-3).map((log, i) => (
                <div key={i} className="text-xs text-[var(--muted)] font-mono bg-[var(--panel)] px-2 py-1 rounded border border-[var(--panel-muted-border)]">
                  {log}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
          <span>Progress</span>
          <span>{steps.filter(s => s.status === 'completed').length}/{steps.length} steps</span>
        </div>
        <div className="w-full bg-[var(--border)]/50 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(steps.filter(s => s.status === 'completed').length / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
