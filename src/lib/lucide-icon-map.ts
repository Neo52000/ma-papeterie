import {
  Printer, Copy, Car, Stamp, Building2, Briefcase, Camera, FileText,
  Clock, MapPin, Phone, Shield, Euro, Upload, Settings, CheckCircle,
  Star, Heart, Users, Zap, Award, Globe, Package, Truck, CreditCard,
  Lock, Key, Scissors, BookOpen, Palette, Maximize, PenTool,
  Mail, MessageSquare, ThumbsUp, Lightbulb, Target, TrendingUp,
  ShoppingCart, Gift, Layers, Monitor, Smartphone, Wifi, Cloud,
  Calendar, Bell, Search, Eye, Edit, Trash2, Plus, Minus,
  ArrowRight, ExternalLink, Download, Share2, Info, AlertTriangle,
  HelpCircle, type LucideIcon,
} from "lucide-react";

/** Subset of Lucide icons available in the page builder icon picker */
export const ICON_MAP: Record<string, LucideIcon> = {
  Printer, Copy, Car, Stamp, Building2, Briefcase, Camera, FileText,
  Clock, MapPin, Phone, Shield, Euro, Upload, Settings, CheckCircle,
  Star, Heart, Users, Zap, Award, Globe, Package, Truck, CreditCard,
  Lock, Key, Scissors, BookOpen, Palette, Maximize, PenTool,
  Mail, MessageSquare, ThumbsUp, Lightbulb, Target, TrendingUp,
  ShoppingCart, Gift, Layers, Monitor, Smartphone, Wifi, Cloud,
  Calendar, Bell, Search, Eye, Edit, Trash2, Plus, Minus,
  ArrowRight, ExternalLink, Download, Share2, Info, AlertTriangle,
  HelpCircle,
};

export function getLucideIcon(name: string): LucideIcon | undefined {
  return ICON_MAP[name];
}

export const ICON_NAMES = Object.keys(ICON_MAP);
