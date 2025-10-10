import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <div className={`bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
