import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Composant de redirection pour préserver la compatibilité avec les anciennes routes /carbo-start/*
 * Redirige vers /bilan-carbone/* en préservant le chemin
 */
export const RedirectCarboStart = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Extraire le chemin après /carbo-start
    const path = location.pathname.replace('/carbo-start', '/bilan-carbone');
    // Préserver les query params et hash si présents
    const search = location.search;
    const hash = location.hash;
    const newPath = path + search + hash;
    
    navigate(newPath, { replace: true });
  }, [location, navigate]);

  return null;
};

