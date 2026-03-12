import React from 'react';
import './Options.css';

interface Props {
  title: string;
}

const Options: React.FC<Props> = ({ title }: Props) => {
  return <div className="tmd-options-wrap">{title} Page</div>;
};

export default Options;
