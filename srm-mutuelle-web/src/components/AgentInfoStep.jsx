import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const schema = yup.object().shape({
  matricule: yup.string().required('Matricule requis'),
  nom: yup.string().required('Nom requis'),
  prenom: yup.string().required('Prénom requis'),
  dateNaissance: yup.date().required('Date de naissance requise'),
  telephone: yup.string().required('Téléphone requis'),
  dateRecrutement: yup.date().required('Date de recrutement requise'),
  statut: yup.string().required('Statut requis'),
  email: yup.string().email('Email invalide').required('Email requis'),
  situation: yup.string().required('Situation familiale requise'),
});

export default function AgentInfoStep({ defaultValues = {}, onNext }) {
  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues,
    resolver: yupResolver(schema),
    mode: 'onBlur',
  });

  const submit = (data) => {
    onNext(data);
  };

  const Input = ({ name, label, type = 'text' }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={name}>{label}</label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <input id={name} type={type} className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors[name] ? 'border-red-500' : 'border-gray-300'}`} {...field} />
        )}
      />
      {errors[name] && <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>}
    </div>
  );

  const Select = ({ name, label, options }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={name}>{label}</label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <select id={name} className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors[name] ? 'border-red-500' : 'border-gray-300'}`} {...field}>
            <option value="">-- Sélectionner --</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}
      />
      {errors[name] && <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(submit)} className="p-6 bg-white bg-opacity-80 rounded-xl shadow-lg backdrop-blur-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Informations Agent</h2>
      <Input name="matricule" label="Matricule" />
      <Input name="nom" label="Nom" />
      <Input name="prenom" label="Prénom" />
      <Input name="dateNaissance" label="Date de naissance" type="date" />
      <Input name="telephone" label="Téléphone" />
      <Input name="dateRecrutement" label="Date de recrutement" type="date" />
      <Select name="statut" label="Statut" options={['Actif', 'Inactif', 'Suspendu']} />
      <Input name="email" label="Email" type="email" />
      <Select name="situation" label="Situation familiale" options={['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve']} />
      <div className="flex justify-end mt-6">
        <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition">Suivant</button>
      </div>
    </form>
  );
}
