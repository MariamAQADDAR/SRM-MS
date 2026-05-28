import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const beneficiarySchema = yup.object().shape({
  nom: yup.string().required('Nom requis'),
  prenom: yup.string().required('Prénom requis'),
  type: yup.string().required('Type requis'),
  dateNaissance: yup.date().required('Date de naissance requise'),
});

export default function BeneficiariesStep({ defaultValues = [], onNext, onBack }) {
  const [rows, setRows] = useState(
    defaultValues.length ? defaultValues : [{ id: Date.now(), nom: '', prenom: '', type: '', dateNaissance: '' }]
  );

  const addRow = () => setRows([...rows, { id: Date.now(), nom: '', prenom: '', type: '', dateNaissance: '' }]);
  const removeRow = (id) => setRows(rows.filter((r) => r.id !== id));

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(yup.object().shape({ rows: yup.array().of(beneficiarySchema).min(1, 'Au moins un bénéficiaire requis') })),
    defaultValues: { rows },
  });

  const onSubmit = (data) => {
    onNext(data.rows);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 bg-white bg-opacity-80 rounded-xl shadow-lg backdrop-blur-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Bénéficiaires</h2>
      {rows.map((row, index) => (
        <div key={row.id} className="border-b pb-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Bénéficiaire #{index + 1}</h3>
            {rows.length > 1 && (
              <button type="button" onClick={() => removeRow(row.id)} className="text-red-600 hover:underline">
                Supprimer
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name={`rows[${index}].nom`}
              control={control}
              render={({ field }) => (
                <input placeholder="Nom" className="px-3 py-2 border rounded-md" {...field} />
              )}
            />
            <Controller
              name={`rows[${index}].prenom`}
              control={control}
              render={({ field }) => (
                <input placeholder="Prénom" className="px-3 py-2 border rounded-md" {...field} />
              )}
            />
            <Controller
              name={`rows[${index}].type`}
              control={control}
              render={({ field }) => (
                <select className="px-3 py-2 border rounded-md" {...field}>
                  <option value="">-- Type --</option>
                  <option value="enfant">Enfant</option>
                  <option value="conjoint">Conjoint</option>
                  <option value="parent">Parent</option>
                </select>
              )}
            />
            <Controller
              name={`rows[${index}].dateNaissance`}
              control={control}
              render={({ field }) => (
                <input type="date" className="px-3 py-2 border rounded-md" {...field} />
              )}
            />
          </div>
          {errors?.rows?.[index] && (
            <p className="mt-1 text-sm text-red-600">
              {Object.values(errors.rows[index] || {}).map((e) => e.message).join(', ')}
            </p>
          )}
        </div>
      ))}
      <button type="button" onClick={addRow} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition mb-4">
        + Ajouter un bénéficiaire
      </button>
      <div className="flex justify-between mt-6">
        <button type="button" onClick={onBack} className="px-6 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">
          Retour
        </button>
        <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
          Suivant
        </button>
      </div>
    </form>
  );
}
