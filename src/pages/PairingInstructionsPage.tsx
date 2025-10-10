import React from 'react';
import Card from '../components/ui/Card';
import { Tv } from 'lucide-react';

const PairingInstructionsPage: React.FC = () => {
  const pairingUrl = `${window.location.origin}/pair`;

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Connect a Display</h1>
        <p className="mt-4 text-lg text-gray-600">
          Follow these simple steps to pair your physical display device with SignageFlow.
        </p>
      </div>
      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-2xl">
        <Card className="p-8">
          <div className="flex flex-col items-center">
            <Tv className="h-24 w-24 text-gray-300" />
            <p className="mt-6 text-lg font-medium text-gray-900">Step 1: Open a Browser</p>
            <p className="mt-1 text-gray-600">On your display device (Smart TV, Raspberry Pi, etc.), open a web browser.</p>

            <p className="mt-8 text-lg font-medium text-gray-900">Step 2: Go to the Pairing URL</p>
            <p className="mt-2 text-gray-600">Enter the following URL into the browser's address bar:</p>
            <div className="mt-2 bg-gray-100 p-3 rounded-md font-mono text-indigo-700 w-full text-center">
              {pairingUrl}
            </div>
            <p className="mt-4 text-sm text-gray-500">
              You will be prompted to enter a 6-digit pairing code which you can generate from the Screen Editor page.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PairingInstructionsPage;
