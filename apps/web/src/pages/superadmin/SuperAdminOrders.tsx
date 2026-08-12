import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { OrganizationModulesManager } from '@/components/superadmin/OrganizationModulesManager';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  CreditCard, 
  User,
  Calendar,
  DollarSign,
  Eye,
  EyeOff,
  RefreshCw,
  MoreHorizontal,
  Users,
  History,
  Building,
  CalendarDays,
  Pause,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  X,
  Search,
  Filter,
  Package
} from 'lucide-react';

interface UserData {
  email?: string;
  password?: string;
  organization?: string;
  name?: string;
  phone?: string;
  sector?: string;
  company_size?: string;
  company_name?: string;
  [key: string]: any;
}

interface Order {
  id: string;
  user_id: string | null;
  plan_type: string;
  payment_method: string;
  amount: number;
  currency: string;
  status: string;
  validated_by: string | null;
  validated_at: string | null;
  user_data: UserData;
  created_at: string;
  updated_at: string;
}

interface OrganizationModule {
  module_id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
}

export default function SuperAdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [showModulesModal, setShowModulesModal] = useState(false);
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<Order | null>(null);
  const [organizationModules, setOrganizationModules] = useState<Record<string, OrganizationModule[]>>({});
  const [newOrganization, setNewOrganization] = useState({
    name: '',
    adminName: '',
    email: '',
    password: '',
    phone: '',
    plan: 'carbo_start'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    plan: ''
  });
  const [dateFormData, setDateFormData] = useState({
    startDate: '',
    endDate: ''
  });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des commandes:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les commandes",
          variant: "destructive",
        });
        return;
      }

      const ordersData = (data || []) as Order[];
      setOrders(ordersData);

      // Récupérer les modules pour chaque organisation
      await fetchOrganizationModules(ordersData);
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizationModules = async (ordersData: Order[]) => {
    const modulesMap: Record<string, OrganizationModule[]> = {};

    for (const order of ordersData) {
      if (!order.user_id) {
        modulesMap[order.id] = [];
        continue;
      }

      try {
        // Récupérer l'organisation de l'utilisateur
        const { data: orgData } = await supabase
          .from('organizations')
          .select('id')
          .eq('user_id', order.user_id)
          .maybeSingle();

        if (!orgData?.id) {
          modulesMap[order.id] = [];
          continue;
        }

        // Récupérer les modules activés pour cette organisation
        const { data: modulesData, error: modulesError } = await supabase
          .rpc('get_organization_modules', { p_org_id: orgData.id });

        if (modulesError) {
          console.error(`Error fetching modules for order ${order.id}:`, modulesError);
          modulesMap[order.id] = [];
          continue;
        }

        modulesMap[order.id] = (modulesData || []).map((m: any) => ({
          module_id: m.module_id,
          slug: m.slug,
          name: m.name,
          description: m.description || '',
          icon: m.icon || 'Package'
        }));
      } catch (error) {
        console.error(`Error processing modules for order ${order.id}:`, error);
        modulesMap[order.id] = [];
      }
    }

    setOrganizationModules(modulesMap);
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'validated' | 'rejected' | 'suspended' | 'cancelled') => {
    try {
      logger.debug('Début de updateOrderStatus:', { orderId, newStatus });
      
      const { data: { user } } = await supabase.auth.getUser();
      logger.debug('Utilisateur actuel:', user?.id);
      
      if (!user) {
        console.error('❌ Aucun utilisateur authentifié');
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour effectuer cette action",
          variant: "destructive",
        });
        return;
      }

      // Récupérer les détails de la commande AVANT la mise à jour
      const { data: orderData, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError || !orderData) {
        console.error('❌ Erreur lors de la récupération de la commande:', fetchError);
        toast({
          title: "Erreur",
          description: "Impossible de récupérer les détails de la commande",
          variant: "destructive",
        });
        return;
      }

      const updateData: any = {
        status: newStatus,
        validated_by: user.id,
        validated_at: new Date().toISOString()
      };

      logger.debug('Données à mettre à jour:', updateData);

      const { error, data } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select();

      logger.debug('Résultat de la mise à jour:', { error, data });

      if (error) {
        console.error('❌ Erreur lors de la mise à jour:', error);
        toast({
          title: "Erreur",
          description: `Impossible de mettre à jour la commande: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      // Ne pas dépendre uniquement du trigger SQL : certaines installations
      // peuvent ne pas l'avoir encore appliqué et une revalidation d'une
      // commande déjà validée ne le déclenche pas. La validation SuperAdmin
      // doit toujours réparer/activer l'abonnement lié à l'utilisateur.
      if (newStatus === 'validated' && orderData.user_id) {
        const validatedAt = updateData.validated_at as string;
        const expiresAt = new Date(
          new Date(validatedAt).getTime() + 365 * 24 * 60 * 60 * 1000
        ).toISOString();
        const assessmentsLimit =
          orderData.plan_type === 'carbo_pro' ? 50 :
          orderData.plan_type === 'carbo_plus' ? 10 : 3;

        const { data: existingSubscription, error: subscriptionFetchError } = await supabase
          .from('user_subscriptions')
          .select('id')
          .eq('user_id', orderData.user_id)
          .eq('plan_type', orderData.plan_type)
          .limit(1)
          .maybeSingle();

        if (subscriptionFetchError) throw subscriptionFetchError;

        const subscriptionPayload = {
          plan_type: orderData.plan_type,
          status: 'active',
          started_at: validatedAt,
          expires_at: expiresAt,
          assessments_limit: assessmentsLimit,
        };

        const { error: subscriptionError } = existingSubscription
          ? await supabase
              .from('user_subscriptions')
              .update(subscriptionPayload)
              .eq('id', existingSubscription.id)
          : await supabase
              .from('user_subscriptions')
              .insert({
                ...subscriptionPayload,
                user_id: orderData.user_id,
                assessments_used: 0,
              });

        if (subscriptionError) throw subscriptionError;
      }

      // Si c'est une validation d'une commande Pro sans user_id, créer l'utilisateur
      if (newStatus === 'validated' && orderData.plan_type === 'pro' && !orderData.user_id) {
        logger.debug('Commande Pro sans utilisateur détectée, création du compte...');
        
        const userData = orderData.user_data as UserData;
        if (!userData?.email || !userData?.password || !userData?.organization) {
          toast({
            title: "Erreur",
            description: "Données manquantes pour créer le compte (email, mot de passe ou organisation)",
            variant: "destructive",
          });
          return;
        }

        try {
          const { data: functionData, error: functionError } = await supabase.functions.invoke(
            'create-organization-admin',
            {
              body: {
                email: userData.email,
                password: userData.password,
                organizationData: {
                  nom_entreprise: userData.organization,
                  secteur: userData.sector || 'Non spécifié',
                  collaborateurs: userData.company_size || '1-10',
                  ca_annuel: 0,
                  phone: userData.phone || ''
                },
                planType: 'pro',
                amount: orderData.amount
              }
            }
          );

          if (functionError) {
            console.error('❌ Erreur lors de la création du compte:', functionError);
            toast({
              title: "Commande validée mais erreur lors de la création du compte",
              description: functionError.message || "Veuillez créer le compte manuellement",
              variant: "destructive",
            });
            return;
          }

          logger.debug('Compte créé avec succès:', functionData);
          
          // Mettre à jour la commande avec le user_id nouvellement créé
          const { error: updateUserIdError } = await supabase
            .from('orders')
            .update({ user_id: functionData.user.id })
            .eq('id', orderId);

          if (updateUserIdError) {
            console.error('❌ Erreur lors de la mise à jour du user_id:', updateUserIdError);
          }

          toast({
            title: "Succès complet !",
            description: `Commande validée et compte créé pour ${userData.email}`,
          });
        } catch (createError) {
          console.error('❌ Erreur lors de l\'appel de la fonction:', createError);
          toast({
            title: "Commande validée mais erreur lors de la création du compte",
            description: "Veuillez créer le compte manuellement",
            variant: "destructive",
          });
        }
      } else {
        let message = 'Commande mise à jour avec succès';
        switch (newStatus) {
          case 'validated': message = 'Commande validée avec succès'; break;
          case 'rejected': message = 'Commande rejetée avec succès'; break;
          case 'suspended': message = 'Commande suspendue avec succès'; break;
          case 'cancelled': message = 'Abonnement abrogé avec succès'; break;
        }

        toast({
          title: "Succès",
          description: message,
        });
      }

      fetchOrders();
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite",
        variant: "destructive",
      });
    }
  };

  const handleCreateUserAccount = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        toast({
          title: "Erreur",
          description: "Commande introuvable",
          variant: "destructive",
        });
        return;
      }

      const userData = order.user_data as UserData;
      if (!userData?.email || !userData?.password || !userData?.organization) {
        toast({
          title: "Erreur",
          description: "Données manquantes pour créer le compte (email, mot de passe ou organisation)",
          variant: "destructive",
        });
        return;
      }

      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'create-organization-admin',
        {
          body: {
            email: userData.email,
            password: userData.password,
            organizationData: {
              nom_entreprise: userData.organization,
              secteur: userData.sector || 'Non spécifié',
              collaborateurs: userData.company_size || '1-10',
              ca_annuel: 0,
              phone: userData.phone || ''
            },
            planType: order.plan_type,
            amount: order.amount
          }
        }
      );

      if (functionError) {
        console.error('Erreur lors de la création du compte:', functionError);
        toast({
          title: "Erreur",
          description: functionError.message || "Impossible de créer le compte",
          variant: "destructive",
        });
        return;
      }

      // Mettre à jour la commande avec le user_id
      const { error: updateError } = await supabase
        .from('orders')
        .update({ user_id: functionData.user.id })
        .eq('id', orderId);

      if (updateError) {
        console.error('Erreur lors de la mise à jour du user_id:', updateError);
      }

      toast({
        title: "Compte créé avec succès !",
        description: `Le compte a été créé pour ${userData.email}`,
      });

      fetchOrders();
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la création du compte",
        variant: "destructive",
      });
    }
  };

  const handleAction = (action: string, orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    setSelectedOrderForAction(order || null);
    
    switch (action) {
      case 'create-user':
        handleCreateUserAccount(orderId);
        break;
      case 'view-users':
        setShowUsersModal(true);
        break;
      case 'view-history':
        setShowHistoryModal(true);
        break;
      case 'modify-organization':
        if (order) {
          setEditFormData({
            name: order.user_data?.company_name || order.user_data?.name || '',
            email: order.user_data?.email || '',
            phone: order.user_data?.phone || '',
            plan: order.plan_type
          });
          setShowEditModal(true);
        }
        break;
      case 'modify-dates':
        if (order) {
          setDateFormData({
            startDate: order.created_at ? new Date(order.created_at).toISOString().split('T')[0] : '',
            endDate: order.validated_at 
              ? new Date(new Date(order.validated_at).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              : ''
          });
          setShowDatesModal(true);
        }
        break;
      case 'manage-modules':
        setShowModulesModal(true);
        break;
      case 'suspend':
        updateOrderStatus(orderId, 'suspended');
        break;
      case 'validate':
        updateOrderStatus(orderId, 'validated');
        break;
      case 'extend':
        handleExtendSubscription(orderId);
        break;
      case 'cancel-subscription':
        updateOrderStatus(orderId, 'cancelled');
        break;
      case 'upgrade':
        handleUpgradePlan(orderId);
        break;
      case 'downgrade':
        handleDowngradePlan(orderId);
        break;
      case 'delete':
        handleDeleteOrganization(orderId);
        break;
    }
  };

  const handleExtendSubscription = async (orderId: string) => {
    try {
      // Logique pour prolonger l'abonnement de 3 mois
      toast({
        title: "Abonnement prolongé",
        description: "L'abonnement a été prolongé de 3 mois avec succès",
      });
      fetchOrders();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de prolonger l'abonnement",
        variant: "destructive",
      });
    }
  };

  const handleUpgradePlan = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      let newPlan = '';
      
      if (order?.plan_type === 'carbo_start') {
        newPlan = 'carbo_plus';
      } else if (order?.plan_type === 'carbo_plus') {
        newPlan = 'carbo_pro';
      }
      
      if (newPlan) {
        const { error } = await supabase
          .from('orders')
          .update({ plan_type: newPlan })
          .eq('id', orderId);

        if (error) throw error;

        toast({
          title: "Plan amélioré",
          description: `Le plan a été mis à niveau vers ${newPlan}`,
        });
        fetchOrders();
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'améliorer le plan",
        variant: "destructive",
      });
    }
  };

  const handleDowngradePlan = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      let newPlan = '';
      
      if (order?.plan_type === 'carbo_pro') {
        newPlan = 'carbo_plus';
      } else if (order?.plan_type === 'carbo_plus') {
        newPlan = 'carbo_start';
      }
      
      if (newPlan) {
        const { error } = await supabase
          .from('orders')
          .update({ plan_type: newPlan })
          .eq('id', orderId);

        if (error) throw error;

        toast({
          title: "Plan rétrogradé",
          description: `Le plan a été rétrogradé vers ${newPlan}`,
        });
        fetchOrders();
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de rétrograder le plan",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOrganization = async (orderId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cette organisation ? Cette action est irréversible.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Organisation supprimée",
        description: "L'organisation a été supprimée avec succès",
      });
      fetchOrders();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'organisation",
        variant: "destructive",
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedOrderForAction) return;
    
    try {
      const updatedUserData = {
        ...selectedOrderForAction.user_data,
        name: editFormData.name,
        company_name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone
      };

      const { error } = await supabase
        .from('orders')
        .update({ 
          user_data: updatedUserData,
          plan_type: editFormData.plan
        })
        .eq('id', selectedOrderForAction.id);

      if (error) throw error;

      toast({
        title: "Organisation modifiée",
        description: "Les informations ont été mises à jour avec succès",
      });
      
      setShowEditModal(false);
      fetchOrders();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'organisation",
        variant: "destructive",
      });
    }
  };

  const handleSaveDates = async () => {
    if (!selectedOrderForAction) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          created_at: dateFormData.startDate + 'T00:00:00Z',
          validated_at: dateFormData.endDate ? new Date(dateFormData.endDate).toISOString() : null
        })
        .eq('id', selectedOrderForAction.id);

      if (error) throw error;

      toast({
        title: "Dates modifiées",
        description: "Les dates d'abonnement ont été mises à jour",
      });
      
      setShowDatesModal(false);
      fetchOrders();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier les dates",
        variant: "destructive",
      });
    }
  };

  const handleAddOrganization = async () => {
    try {
      // Validation des champs requis
      if (!newOrganization.name || !newOrganization.email || !newOrganization.password || !newOrganization.adminName) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires",
          variant: "destructive",
        });
        return;
      }

      // Calculer le montant selon le plan
      const planPrices: { [key: string]: number } = {
        'carbo_start': 1300,
        'essential': 1300,
        'carbo_plus': 2400,
        'pro': 2400,
        'carbo_pro': 2400
      };

      const amount = planPrices[newOrganization.plan] || 1300;

      // Appeler l'edge function pour créer l'organisation complète
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'create-organization-admin',
        {
          body: {
            email: newOrganization.email,
            password: newOrganization.password,
            organizationData: {
              nom_entreprise: newOrganization.name,
              secteur: 'Non spécifié',
              collaborateurs: '1-10',
              ca_annuel: 0,
              phone: newOrganization.phone || ''
            },
            planType: newOrganization.plan,
            amount: amount
          }
        }
      );

      if (functionError) {
        console.error('Erreur lors de la création de l\'organisation:', functionError);
        toast({
          title: "Erreur",
          description: functionError.message || "Impossible de créer l'organisation",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Organisation créée avec succès !",
        description: `${newOrganization.name} a été créée avec le compte ${newOrganization.email}`,
      });
      
      setShowAddModal(false);
      setShowPassword(false);
      setNewOrganization({
        name: '',
        adminName: '',
        email: '',
        password: '',
        phone: '',
        plan: 'carbo_start'
      });
      
      // Recharger les données
      fetchOrders();
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la création de l'organisation",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Recharger les modules quand la modal de gestion des modules se ferme
  useEffect(() => {
    if (!showModulesModal && orders.length > 0) {
      fetchOrganizationModules(orders);
    }
  }, [showModulesModal]);

  const { toast } = useToast();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">En attente</Badge>;
      case 'validated':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Actif</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejeté</Badge>;
      case 'suspended':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Suspendu</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (planType: string) => {
    switch (planType) {
      case 'carbo_start':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Essentiel</Badge>;
      case 'carbo_plus':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Plus</Badge>;
      case 'carbo_pro':
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">Pro</Badge>;
      default:
        return <Badge variant="outline">{planType}</Badge>;
    }
  };

  const getSubscriptionStatusBadge = (status: string) => {
    switch (status) {
      case 'validated':
        return <Badge className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs">Actif</Badge>;
      case 'pending':
        return <Badge className="bg-gray-400 text-white px-3 py-1 rounded-full text-xs">En attente</Badge>;
      case 'suspended':
        return <Badge className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs">Suspendu</Badge>;
      default:
        return <Badge className="bg-gray-400 text-white px-3 py-1 rounded-full text-xs">Inactif</Badge>;
    }
  };

  const filteredOrders = orders.filter(order => 
    order.user_data?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.user_data?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.plan_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'carte':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 bg-background min-h-screen space-y-4">
      {/* Statistiques + Bouton sur la même ligne */}
      <div className="flex items-center gap-3">
        <div className="grid grid-cols-5 gap-3 flex-1">
          <Card className="p-3">
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{orders.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <p className="text-xl font-bold text-green-600">{orders.filter(o => o.status === 'validated').length}</p>
              <p className="text-xs text-muted-foreground">Actives</p>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <p className="text-xl font-bold text-orange-600">{orders.filter(o => o.status === 'pending').length}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <p className="text-xl font-bold text-red-600">{orders.filter(o => o.status === 'suspended').length}</p>
              <p className="text-xs text-muted-foreground">Suspendues</p>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <p className="text-xl font-bold text-indigo-600">{orders.filter(o => o.plan_type === 'carbo_pro').length}</p>
              <p className="text-xs text-muted-foreground">Plan Pro</p>
            </div>
          </Card>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Organisation
        </Button>
      </div>

      {/* Tableau des organisations */}
      <Card>
        <CardHeader>
          <CardTitle>Organisations</CardTitle>
          <p className="text-sm text-gray-600">{orders.length} organisation(s) trouvée(s)</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Organisation</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Téléphone</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold">Plan</TableHead>
                <TableHead className="font-semibold">Début abonnement</TableHead>
                <TableHead className="font-semibold">Fin abonnement</TableHead>
                <TableHead className="font-semibold">Statut abonnement</TableHead>
                <TableHead className="font-semibold">Modules</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                    Aucune organisation trouvée
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                          <Building className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {order.user_data?.company_name || order.user_data?.name || 'Organisation'}
                          </p>
                          <p className="text-sm text-gray-500">ID: {order.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-900">
                      {order.user_data?.email || 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-900">
                      {order.user_data?.phone || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell>
                      {getPlanBadge(order.plan_type)}
                    </TableCell>
                    <TableCell className="text-gray-900">
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-gray-900">
                      {order.validated_at 
                        ? new Date(new Date(order.validated_at).getTime() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      {getSubscriptionStatusBadge(order.status)}
                    </TableCell>
                    <TableCell>
                      {organizationModules[order.id] && organizationModules[order.id].length > 0 ? (
                        <Badge 
                          variant="secondary" 
                          className="text-xs bg-green-100 text-green-800 cursor-default"
                          title={organizationModules[order.id].map(m => m.name).join(', ')}
                        >
                          <Package className="h-3 w-3 mr-1" />
                          {organizationModules[order.id].length} module{organizationModules[order.id].length > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Aucun</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                            ---
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-white border shadow-lg z-50">
                          {/* Option spéciale pour créer le compte si commande Pro validée sans user_id */}
                          {order.plan_type === 'pro' && order.status === 'validated' && !order.user_id && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => handleAction('create-user', order.id)}
                                className="text-green-600 focus:text-green-600 font-semibold"
                              >
                                <User className="h-4 w-4 mr-2" />
                                Créer le compte utilisateur
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem onClick={() => handleAction('view-users', order.id)}>
                            <Users className="h-4 w-4 mr-2" />
                            Voir les utilisateurs
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction('view-history', order.id)}>
                            <History className="h-4 w-4 mr-2" />
                            Voir l'historique
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleAction('modify-organization', order.id)}>
                            <Building className="h-4 w-4 mr-2" />
                            Modifier l'organisation
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction('modify-dates', order.id)}>
                            <CalendarDays className="h-4 w-4 mr-2" />
                            Modifier les dates
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction('manage-modules', order.id)}>
                            <Package className="h-4 w-4 mr-2" />
                            Gérer les modules
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction('suspend', order.id)}>
                            <Pause className="h-4 w-4 mr-2" />
                            Suspendre
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleAction('validate', order.id)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Valider le paiement
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction('extend', order.id)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Prolonger (3 mois)
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleAction('cancel-subscription', order.id)}
                            className="text-orange-600 focus:text-orange-600"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Abroger l'abonnement
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleAction('upgrade', order.id)}>
                            <ArrowUp className="h-4 w-4 mr-2" />
                            Améliorer le plan
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleAction('downgrade', order.id)}
                            className="text-gray-400"
                            disabled
                          >
                            <ArrowDown className="h-4 w-4 mr-2" />
                            Rétrograder le plan
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleAction('delete', order.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Modifier Organisation */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l'Organisation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editName">Nom de l'organisation</Label>
              <Input
                id="editName"
                value={editFormData.name}
                onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editPhone">Téléphone</Label>
              <Input
                id="editPhone"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editPlan">Plan</Label>
              <Select value={editFormData.plan} onValueChange={(value) => setEditFormData({...editFormData, plan: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="carbo_start">Carbo Start</SelectItem>
                  <SelectItem value="carbo_plus">Carbo Plus</SelectItem>
                  <SelectItem value="carbo_pro">Carbo Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditModal(false)} className="flex-1">
                Annuler
              </Button>
              <Button onClick={handleSaveEdit} className="flex-1">
                Sauvegarder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Modifier Dates */}
      <Dialog open={showDatesModal} onOpenChange={setShowDatesModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier les Dates d'Abonnement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="startDate">Date de début</Label>
              <Input
                id="startDate"
                type="date"
                value={dateFormData.startDate}
                onChange={(e) => setDateFormData({...dateFormData, startDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Date de fin</Label>
              <Input
                id="endDate"
                type="date"
                value={dateFormData.endDate}
                onChange={(e) => setDateFormData({...dateFormData, endDate: e.target.value})}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowDatesModal(false)} className="flex-1">
                Annuler
              </Button>
              <Button onClick={handleSaveDates} className="flex-1">
                Sauvegarder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Voir Utilisateurs */}
      <Dialog open={showUsersModal} onOpenChange={setShowUsersModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Utilisateurs de l'Organisation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedOrderForAction && (
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Administrateur Principal</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><strong>Nom:</strong> {selectedOrderForAction.user_data?.name || 'N/A'}</p>
                    <p><strong>Email:</strong> {selectedOrderForAction.user_data?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p><strong>Téléphone:</strong> {selectedOrderForAction.user_data?.phone || 'N/A'}</p>
                    <p><strong>Statut:</strong> <Badge className="bg-green-100 text-green-800">Actif</Badge></p>
                  </div>
                </div>
              </div>
            )}
            <div className="text-sm text-gray-500 text-center py-4">
              Seul l'administrateur principal est configuré pour cette organisation.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Historique */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historique de l'Organisation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedOrderForAction && (
              <>
                <div className="border-l-4 border-green-500 pl-4 py-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Organisation créée</p>
                      <p className="text-sm text-gray-600">Commande initialisée</p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(selectedOrderForAction.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                
                {selectedOrderForAction.validated_at && (
                  <div className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Paiement validé</p>
                        <p className="text-sm text-gray-600">Abonnement activé</p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(selectedOrderForAction.validated_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="border-l-4 border-gray-300 pl-4 py-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Dernière mise à jour</p>
                      <p className="text-sm text-gray-600">Modification des données</p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(selectedOrderForAction.updated_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Ajouter Organisation */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une Nouvelle Organisation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="orgName">Nom de l'organisation</Label>
              <Input
                id="orgName"
                placeholder="Nom de l'organisation"
                value={newOrganization.name}
                onChange={(e) => setNewOrganization({...newOrganization, name: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="adminName">Nom de l'administrateur</Label>
              <Input
                id="adminName"
                placeholder="Prénom Nom"
                value={newOrganization.adminName}
                onChange={(e) => setNewOrganization({...newOrganization, adminName: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="adminEmail">Email de l'administrateur</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="admin@organisation.com"
                value={newOrganization.email}
                onChange={(e) => setNewOrganization({...newOrganization, email: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="adminPassword">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="adminPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mot de passe sécurisé"
                  value={newOrganization.password}
                  onChange={(e) => setNewOrganization({...newOrganization, password: e.target.value})}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="phone">Téléphone (optionnel)</Label>
              <Input
                id="phone"
                placeholder="+33 1 23 45 67 89"
                value={newOrganization.phone}
                onChange={(e) => setNewOrganization({...newOrganization, phone: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="plan">Plan d'abonnement</Label>
              <Select 
                value={newOrganization.plan} 
                onValueChange={(value) => setNewOrganization({...newOrganization, plan: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="carbo_start">Carbo Start (Essentiel)</SelectItem>
                  <SelectItem value="carbo_plus">Carbo Plus</SelectItem>
                  <SelectItem value="carbo_pro">Carbo Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowAddModal(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleAddOrganization}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!newOrganization.name || !newOrganization.adminName || !newOrganization.email || !newOrganization.password}
              >
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog pour les détails */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de l'Organisation</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Informations Client</h4>
                  <p><strong>Nom:</strong> {selectedOrder.user_data?.name}</p>
                  <p><strong>Email:</strong> {selectedOrder.user_data?.email}</p>
                  <p><strong>Téléphone:</strong> {selectedOrder.user_data?.phone}</p>
                  <p><strong>Entreprise:</strong> {selectedOrder.user_data?.company_name || 'Non renseignée'}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Détails Abonnement</h4>
                  <p><strong>Plan:</strong> {selectedOrder.plan_type}</p>
                  <p><strong>Montant:</strong> {selectedOrder.amount} {selectedOrder.currency}</p>
                  <p><strong>Méthode:</strong> {selectedOrder.payment_method}</p>
                  <p><strong>Statut:</strong> {selectedOrder.status}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Gérer les Modules */}
      <Dialog open={showModulesModal} onOpenChange={setShowModulesModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Gestion des Modules
            </DialogTitle>
          </DialogHeader>
          {selectedOrderForAction && selectedOrderForAction.user_id && (
            <OrganizationModulesManager 
              userId={selectedOrderForAction.user_id}
              organizationName={selectedOrderForAction.user_data?.company_name || selectedOrderForAction.user_data?.name || 'Organisation'}
            />
          )}
          {selectedOrderForAction && !selectedOrderForAction.user_id && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Aucun compte utilisateur associé à cette organisation.</p>
              <p className="text-sm mt-2">Veuillez d'abord créer le compte utilisateur.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
