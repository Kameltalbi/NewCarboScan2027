import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Database,
  Search,
  BarChart3,
  ArrowLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/integrations/api/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EmissionFactorRow {
  id: string;
  key: string;
  name: string;
  emission_factor: number;
  unit: string;
  scope: number;
  source: string;
  geography: string;
  category: string;
}

export const EmissionFactors: React.FC = () => {
  const navigate = useNavigate();
  const [factors, setFactors] = useState<EmissionFactorRow[]>([]);
  const [pack, setPack] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.listPublicEmissionFactors();
        setPack(data.pack);
        setFactors(data.items as unknown as EmissionFactorRow[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(factors.map((f) => f.category))).sort(),
    [factors],
  );

  const filtered = useMemo(() => {
    return factors.filter((f) => {
      const matchesCat =
        selectedCategory === 'all' || f.category === selectedCategory;
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        f.unit.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [factors, searchTerm, selectedCategory]);

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="h-7 w-7" />
              Facteurs d'émission (public)
            </h1>
            <p className="text-muted-foreground text-sm">
              Pack versionné du testeur gratuit{pack ? ` — ${pack}` : ''}. Le
              registre complet sera branché avec le portage des tables.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Facteurs</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{factors.length}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Catégories</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{categories.length}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Affichés
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{filtered.length}</CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Rechercher…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="md:w-56">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <p>Chargement…</p>
            ) : error ? (
              <p className="text-destructive">{error}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Valeur</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell>{f.emission_factor}</TableCell>
                      <TableCell>{f.unit}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">S{f.scope}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {f.source}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmissionFactors;
