import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Star, UserCheck, UserX, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerSegment {
  segment: 'vip' | 'regular' | 'occasional' | 'inactive';
  count: number;
  customers: Array<{
    email: string;
    orderCount: number;
    totalSpent: number;
    lastOrderDate: string;
  }>;
}

export const CustomerSegmentation = () => {
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    try {
      setLoading(true);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('customer_email, total_amount, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by customer
      const customerMap = new Map<string, {
        orderCount: number;
        totalSpent: number;
        lastOrderDate: string;
      }>();

      orders?.forEach(order => {
        const existing = customerMap.get(order.customer_email);
        if (!existing || new Date(order.created_at) > new Date(existing.lastOrderDate)) {
          customerMap.set(order.customer_email, {
            orderCount: (existing?.orderCount || 0) + 1,
            totalSpent: (existing?.totalSpent || 0) + Number(order.total_amount),
            lastOrderDate: existing ? 
              (new Date(order.created_at) > new Date(existing.lastOrderDate) ? order.created_at : existing.lastOrderDate) 
              : order.created_at,
          });
        }
      });

      // Segment customers
      const now = new Date();
      const vip: CustomerSegment['customers'] = [];
      const regular: CustomerSegment['customers'] = [];
      const occasional: CustomerSegment['customers'] = [];
      const inactive: CustomerSegment['customers'] = [];

      customerMap.forEach((data, email) => {
        const customer = { email, ...data };
        const daysSinceLastOrder = (now.getTime() - new Date(data.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24);

        if (data.totalSpent > 500 && data.orderCount >= 5) {
          vip.push(customer);
        } else if (data.orderCount >= 3 && daysSinceLastOrder < 90) {
          regular.push(customer);
        } else if (data.orderCount >= 1 && daysSinceLastOrder < 180) {
          occasional.push(customer);
        } else {
          inactive.push(customer);
        }
      });

      setSegments([
        { segment: 'vip', count: vip.length, customers: vip },
        { segment: 'regular', count: regular.length, customers: regular },
        { segment: 'occasional', count: occasional.length, customers: occasional },
        { segment: 'inactive', count: inactive.length, customers: inactive },
      ]);
    } catch (error) {
      console.error('Error fetching segments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSegmentIcon = (segment: string) => {
    switch (segment) {
      case 'vip': return <Crown className="h-5 w-5 text-yellow-500" />;
      case 'regular': return <Star className="h-5 w-5 text-blue-500" />;
      case 'occasional': return <UserCheck className="h-5 w-5 text-green-500" />;
      case 'inactive': return <UserX className="h-5 w-5 text-gray-400" />;
      default: return null;
    }
  };

  const getSegmentLabel = (segment: string) => {
    switch (segment) {
      case 'vip': return 'Clients VIP';
      case 'regular': return 'Clients Réguliers';
      case 'occasional': return 'Clients Occasionnels';
      case 'inactive': return 'Clients Inactifs';
      default: return segment;
    }
  };

  const getSegmentDescription = (segment: string) => {
    switch (segment) {
      case 'vip': return '500€+ dépensés, 5+ commandes';
      case 'regular': return '3+ commandes, actif < 90j';
      case 'occasional': return '1+ commande, actif < 180j';
      case 'inactive': return 'Aucune commande > 180j';
      default: return '';
    }
  };

  const handleEmailSegment = (segment: CustomerSegment) => {
    const emails = segment.customers.map(c => c.email).join(', ');
    navigator.clipboard.writeText(emails);
    toast.success(`${segment.count} emails copiés dans le presse-papier`);
  };

  if (loading) {
    return <div>Chargement de la segmentation...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {segments.map((seg) => (
          <Card key={seg.segment}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {getSegmentLabel(seg.segment)}
              </CardTitle>
              {getSegmentIcon(seg.segment)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{seg.count}</div>
              <p className="text-xs text-muted-foreground mb-3">
                {getSegmentDescription(seg.segment)}
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => handleEmailSegment(seg)}
                disabled={seg.count === 0}
              >
                <Mail className="h-3 w-3 mr-1" />
                Copier emails
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {segments.map((seg) => (
        seg.customers.length > 0 && (
          <Card key={`${seg.segment}-detail`}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {getSegmentIcon(seg.segment)}
                <CardTitle>{getSegmentLabel(seg.segment)}</CardTitle>
              </div>
              <CardDescription>{seg.count} client{seg.count > 1 ? 's' : ''}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {seg.customers.slice(0, 10).map((customer) => (
                  <div 
                    key={customer.email}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{customer.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {customer.orderCount} commande{customer.orderCount > 1 ? 's' : ''} • 
                        Dernière: {new Date(customer.lastOrderDate).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {customer.totalSpent.toFixed(2)} €
                    </Badge>
                  </div>
                ))}
                {seg.customers.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    ... et {seg.customers.length - 10} autre{seg.customers.length - 10 > 1 ? 's' : ''} client{seg.customers.length - 10 > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )
      ))}
    </div>
  );
};
