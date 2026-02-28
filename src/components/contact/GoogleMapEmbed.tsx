import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface GoogleMapEmbedProps {
  address?: string;
  className?: string;
}

export default function GoogleMapEmbed({ 
  address = "10 rue Toupot de Beveaux, 52000 Chaumont, France",
  className = ""
}: GoogleMapEmbedProps) {
  // Encode the address for the Google Maps embed URL
  const encodedAddress = encodeURIComponent(address);
  const mapUrl = `https://www.google.com/maps?q=${encodedAddress}&output=embed`;
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Nous trouver
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden rounded-b-lg">
        <div className="relative w-full h-[300px] md:h-[400px]">
          <iframe
            src={mapUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Localisation Papeterie Reine & Fils"
            className="absolute inset-0"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>
        <div className="p-4 bg-muted/50">
          <p className="text-sm text-muted-foreground">
            <strong>Papeterie Reine & Fils</strong><br />
            10 rue Toupot de Beveaux<br />
            52000 Chaumont, France
          </p>
          <a 
            href={`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline mt-2 inline-block"
          >
            Ouvrir dans Google Maps →
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
