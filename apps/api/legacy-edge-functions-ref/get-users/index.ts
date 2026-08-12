import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-USERS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Create a Supabase client with service role key to access auth.users
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    logStep("Admin client created");

    // Verify that the requesting user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    logStep("Auth header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      logStep("Authentication failed", { userError });
      throw new Error("Invalid authentication");
    }

    logStep("User authenticated", { userId: userData.user.id, email: userData.user.email });

    // Check if user has superadmin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    logStep("Role check completed", { roleData, roleError });

    if (roleError) {
      throw new Error(`Role check failed: ${roleError.message}`);
    }

    const isSuperAdmin = roleData?.role === 'superadmin';
    const isFinanceur = roleData?.role === 'financeur';
    
    if (!isSuperAdmin && roleData?.role !== 'admin' && roleData?.role !== 'financeur') {
      throw new Error("Insufficient permissions - admin or superadmin required");
    }

    logStep("Permissions verified", { isSuperAdmin });

    // Multi-tenant handling with optional organizationId from request body
    let organizationId: string | null = null;
    let allowedUserIds: string[] = [];

    // Try to read organizationId from request body (POST from supabase.functions.invoke)
    let requestedOrgId: string | null = null;
    try {
      const body = await req.json().catch(() => null);
      requestedOrgId = body?.organizationId ?? null;
    } catch (_) {
      requestedOrgId = null;
    }

    if (isSuperAdmin || isFinanceur) {
      // Superadmins can see all, but if an organizationId is provided, filter to that organization
      if (requestedOrgId) {
        organizationId = requestedOrgId;
        const { data: org } = await supabaseAdmin
          .from('organizations')
          .select('id, user_id')
          .eq('id', organizationId)
          .maybeSingle();

        const orgOwnerId = org?.user_id ?? null;
        const { data: members } = await supabaseAdmin
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', organizationId);

        allowedUserIds = [
          ...(orgOwnerId ? [orgOwnerId] : []),
          ...(members?.map(m => m.user_id) || [])
        ];
        logStep("Global reader filtering by org", { organizationId, count: allowedUserIds.length });
      }
    } else {
      // Admin: prefer explicit organizationId; otherwise infer from ownership or membership
      if (requestedOrgId) {
        organizationId = requestedOrgId;
      } else {
        // Try ownership
        const { data: ownOrg } = await supabaseAdmin
          .from('organizations')
          .select('id, user_id')
          .eq('user_id', userData.user.id)
          .maybeSingle();
        if (ownOrg?.id) {
          organizationId = ownOrg.id;
        } else {
          // Try membership
          const { data: memberOrg } = await supabaseAdmin
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', userData.user.id)
            .maybeSingle();
          organizationId = memberOrg?.organization_id ?? null;
        }
      }

      if (!organizationId) {
        // No org found: show only the current admin user to avoid empty UI
        allowedUserIds = [userData.user.id];
        logStep("Admin has no organization, returning self only", { userId: userData.user.id });
      } else {
        // Validate access and collect members
        const { data: org } = await supabaseAdmin
          .from('organizations')
          .select('id, user_id')
          .eq('id', organizationId)
          .maybeSingle();

        const { data: membership } = await supabaseAdmin
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', organizationId)
          .eq('user_id', userData.user.id)
          .maybeSingle();

        const isOwner = org?.user_id === userData.user.id;
        const isMember = !!membership;

        if (!isOwner && !isMember) {
          throw new Error("Accès refusé à cette organisation");
        }

        const { data: members } = await supabaseAdmin
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', organizationId);

        const orgOwnerId = org?.user_id ?? null;
        allowedUserIds = [
          ...(orgOwnerId ? [orgOwnerId] : []),
          ...(members?.map(m => m.user_id) || [])
        ];
        logStep("Org members found", { organizationId, count: allowedUserIds.length });
      }
    }
    
    // Récupérer tous les utilisateurs auth
    const { data: authUsersResponse, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      logStep("Failed to fetch auth users", { authError });
      throw new Error(`Failed to fetch users: ${authError.message}`);
    }
    
    // Filtrer selon le rôle
    const filteredUsers = (isSuperAdmin && !organizationId)
      ? authUsersResponse.users
      : authUsersResponse.users.filter(u => allowedUserIds.includes(u.id));
    
    logStep("Users filtered", { total: authUsersResponse.users?.length, filtered: filteredUsers.length });

    // Get user roles
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      logStep("Failed to fetch roles", { rolesError });
      throw new Error(`Failed to fetch roles: ${rolesError.message}`);
    }

    logStep("User roles fetched", { count: userRoles?.length || 0 });

    // Combine auth users with their roles
    const usersWithRoles = filteredUsers.map(user => {
      const roleRecord = userRoles?.find(r => r.user_id === user.id);
      return {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        role: roleRecord?.role || 'user',
        status: (user as any).banned_until ? 'blocked' : 'active'
      };
    });

    logStep("Users combined with roles", { totalUsers: usersWithRoles.length });

    return new Response(JSON.stringify({ users: usersWithRoles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message: errorMessage });
    console.error('Error in get-users function:', error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
