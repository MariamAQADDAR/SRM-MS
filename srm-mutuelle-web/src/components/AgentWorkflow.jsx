import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AgentInfoStep from './AgentInfoStep';
import BeneficiariesStep from './BeneficiariesStep';
import RecapStep from './RecapStep';

const steps = ['Informations Agent', 'Bénéficiaires', 'Récapitulatif'];

export default function AgentWorkflow() {
  const [activeStep, setActiveStep] = useState(0);
  const [agentInfo, setAgentInfo] = useState({});
  const [beneficiaries, setBeneficiaries] = useState([]);

  const nextStep = (data) => {
    if (activeStep === 0) setAgentInfo(data);
    if (activeStep === 1) setBeneficiaries(data);
    setActiveStep((prev) => prev + 1);
  };

  const prevStep = () => setActiveStep((prev) => prev - 1);

  const handleSubmit = async () => {
    const payload = { ...agentInfo, beneficiaries };
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Erreur serveur');
      alert('Agent créé avec succès');
      // reset workflow
      setActiveStep(0);
      setAgentInfo({});
      setBeneficiaries([]);
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return <AgentInfoStep defaultValues={agentInfo} onNext={nextStep} />;
      case 1:
        return (
          <BeneficiariesStep defaultValues={beneficiaries} onNext={nextStep} onBack={prevStep} />
        );
      case 2:
        return (
          <RecapStep
            agentInfo={agentInfo}
            beneficiaries={beneficiaries}
            onBack={prevStep}
            onConfirm={handleSubmit}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 bg-white bg-opacity-90 rounded-xl shadow-lg backdrop-blur-md">
      <div className="flex justify-between mb-6">
        {steps.map((label, idx) => (
          <div key={label} className={`flex-1 text-center ${idx <= activeStep ? 'font-bold text-indigo-600' : 'text-gray-400'}`}>
            {label}
          </div>
        ))}
      </div>
      <AnimatePresence exitBeforeEnter>
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
