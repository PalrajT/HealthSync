import React from "react";
import { useNavigate } from "react-router-dom";

const ArrowBack = () => {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate(-1)}>
      ← Back
    </button>
  );
};

export default ArrowBack;
