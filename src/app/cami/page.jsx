"use client";
import React from "react";
import { useState, useEffect } from "react";

export default function Cami() {
  const startDate = new Date("2024-07-23");
  const today = new Date();
  const diffTime = Math.abs(today - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const baseText = "Ca";
  const miText = "mi".repeat(diffDays - 0);

  return (
    <div>
      <h1>
        Una <b>M</b> por dia.{" "}
      </h1>
      <p>{baseText + miText} 🌷🤝🌻</p>
      <p>han pasado: {diffDays} días desde el inicio.</p>
    </div>
  );
}
