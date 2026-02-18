interface SeoContentProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const SeoSection = ({ title, children, className = "" }: SeoContentProps) => {
  return (
    <section className={`container mx-auto px-4 py-12 ${className}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold text-foreground mb-6">{title}</h2>
        <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
          {children}
        </div>
      </div>
    </section>
  );
};

export const HomeSeoContent = () => {
  return (
    <SeoSection title="Ma Papeterie : Votre Spécialiste en Fournitures Scolaires et de Bureau">
      <p>
        Bienvenue chez <strong>Ma Papeterie - Reine & Fils</strong>, votre référence en matière de <strong>fournitures scolaires</strong> et <strong>matériel de bureau</strong> depuis plus de 15 ans. Notre entreprise familiale allie tradition et modernité pour vous offrir une expérience d'achat unique, que vous soyez particulier, parent d'élève ou professionnel.
      </p>
      
      <h3 className="text-2xl font-semibold text-foreground mt-8 mb-4">Une Large Gamme de Produits pour Tous</h3>
      <p>
        Notre catalogue comprend plus de <strong>40 000 références</strong> soigneusement sélectionnées : cahiers, stylos, cartables, classeurs, matériel de dessin, fournitures de bureau professionnelles et bien plus encore. Des marques reconnues aux meilleurs prix pour équiper toute la famille et les professionnels.
      </p>
      
      <h3 className="text-2xl font-semibold text-foreground mt-8 mb-4">Engagement Écoresponsable</h3>
      <p>
        Conscients des enjeux environnementaux, nous développons constamment notre gamme de <strong>produits écoresponsables</strong> : cahiers en papier recyclé, stylos rechargeables, fournitures en matériaux durables. Faire le choix de Ma Papeterie, c'est aussi contribuer à un avenir plus vert.
      </p>
      
      <h3 className="text-2xl font-semibold text-foreground mt-8 mb-4">Services B2C et B2B</h3>
      <p>
        Particuliers, établissements scolaires, entreprises : nous accompagnons tous vos projets. Nos <strong>services professionnels B2B</strong> incluent des tarifs dégressifs, la facturation mensuelle, la livraison en gros volumes et un accompagnement personnalisé. Pour les parents, découvrez notre service de <strong>listes scolaires pré-remplies</strong> pour une rentrée sans stress.
      </p>
    </SeoSection>
  );
};

export const CatalogueSeoContent = () => {
  return (
    <SeoSection title="Catalogue Complet de Fournitures Scolaires et de Bureau">
      <p>
        Explorez notre <strong>catalogue en ligne</strong> regroupant l'ensemble de nos fournitures scolaires et de bureau. Que vous recherchiez du <strong>matériel pour la rentrée des classes</strong> ou des <strong>fournitures de bureau professionnelles</strong>, vous trouverez tout ce dont vous avez besoin en quelques clics.
      </p>
      
      <h3 className="text-2xl font-semibold text-foreground mt-8 mb-4">Fournitures Scolaires pour Tous les Niveaux</h3>
      <p>
        De la maternelle au lycée, nous proposons des <strong>cahiers</strong>, <strong>classeurs</strong>, <strong>trousses</strong>, <strong>stylos</strong>, <strong>crayons de couleur</strong>, <strong>feutres</strong>, <strong>compas</strong>, <strong>équerres</strong> et tout le matériel nécessaire pour réussir l'année scolaire. Nos produits sont sélectionnés pour leur qualité et leur durabilité.
      </p>
      
      <h3 className="text-2xl font-semibold text-foreground mt-8 mb-4">Matériel de Bureau Professionnel</h3>
      <p>
        Équipez votre espace de travail avec notre sélection de <strong>fournitures de bureau</strong> : ramettes de papier, agrafeuses, perforatrices, classement, post-it, agendas professionnels et accessoires de rangement. Des produits fiables pour améliorer votre productivité au quotidien.
      </p>
      
      <h3 className="text-2xl font-semibold text-foreground mt-8 mb-4">Filtres et Recherche Facile</h3>
      <p>
        Notre système de filtres avancés vous permet de trouver rapidement les produits dont vous avez besoin : recherche par catégorie, prix, type de produit et même filtrage des <strong>articles écoresponsables</strong>. Comparez, sélectionnez et commandez en toute simplicité.
      </p>
    </SeoSection>
  );
};

export const ListesScolairesSeoContent = () => {
  return (
    <SeoSection title="Listes Scolaires : Simplifiez la Rentrée des Classes">
      <p>
        La <strong>rentrée scolaire</strong> approche et vous redoutez la corvée des listes de fournitures ? Ma Papeterie vous simplifie la vie avec son service de <strong>listes scolaires en ligne</strong>. Trouvez la liste de votre établissement, ajoutez les articles au panier en un clic et recevez le tout à domicile.
      </p>
      
      <h3 className="text-2xl font-semibold text-foreground mt-8 mb-4">Comment Ça Marche ?</h3>
      <p>
        Notre système est simple et efficace : recherchez votre établissement par code postal ou nom, sélectionnez la classe de votre enfant, et découvrez la <strong>liste officielle des fournitures</strong>. Tous les articles sont directement ajoutables au panier avec les quantités recommandées. Plus besoin de courir les magasins !
      </p>
      
      <h3 className="text-2xl font-semibold text-foreground mt-8 mb-4">Partenariat avec les Établissements</h3>
      <p>
        Nous collaborons avec de nombreuses <strong>écoles</strong>, <strong>collèges</strong> et <strong>lycées</strong> de France pour vous proposer des listes à jour et conformes aux demandes des enseignants. Établissements scolaires, contactez-nous pour référencer vos listes et faciliter la vie des parents d'élèves.
      </p>
      
      <h3 className="text-2xl font-semibold text-foreground mt-8 mb-4">Gain de Temps et Économies</h3>
      <p>
        Avec notre service de <strong>listes scolaires prêtes à commander</strong>, économisez du temps et profitez de nos prix compétitifs. Livraison rapide garantie avant la rentrée, packs complets disponibles et possibilité de personnaliser selon vos besoins.
      </p>
    </SeoSection>
  );
};

export const PromotionsSeoContent = () => {
  return (
    <SeoSection title="Promotions et Bons Plans Papeterie">
      <p>
        Ne manquez aucune de nos <strong>promotions</strong> et <strong>offres spéciales</strong> sur les fournitures scolaires et de bureau. Toute l'année, Ma Papeterie vous propose des <strong>réductions attractives</strong> sur une large sélection de produits pour équiper petits et grands à prix réduits.
      </p>
      
      <h3 className="text-2xl font-semibold text-foreground mt-8 mb-4">Ventes Flash et Offres Limitées</h3>
      <p>
        Profitez de nos <strong>ventes flash</strong> régulières avec des réductions pouvant aller jusqu'à 40% sur des produits sélectionnés. Cahiers, stylos, cartables, matériel de dessin : consultez régulièrement cette page pour ne rien manquer de nos meilleures affaires.
      </p>
      
      <h3 className="text-2xl font-semibold text-foreground mt-8 mb-4">Promotions Rentrée Scolaire</h3>
      <p>
        Chaque année, nous organisons des <strong>promotions spéciales rentrée des classes</strong> avec des packs complets à prix cassés. Anticipez vos achats et profitez de nos offres groupées pour équiper vos enfants sans exploser votre budget.
      </p>
      
      <h3 className="text-2xl font-semibold text-foreground mt-8 mb-4">Programme Fidélité et Newsletter</h3>
      <p>
        Inscrivez-vous à notre <strong>newsletter</strong> pour recevoir en exclusivité nos codes promo, ventes privées et offres réservées aux membres. Plus vous commandez, plus vous économisez grâce à notre programme de <strong>fidélité avantageux</strong>.
      </p>
    </SeoSection>
  );
};

export const ContactSeoContent = () => {
  return (
    <SeoSection title="Contactez Ma Papeterie : Service Client à Votre Écoute">
      <p>
        L'équipe de <strong>Ma Papeterie</strong> est à votre disposition pour répondre à toutes vos questions concernant nos <strong>fournitures scolaires</strong>, <strong>matériel de bureau</strong>, vos commandes ou nos services. Plusieurs moyens de contact sont mis à votre disposition pour vous offrir la meilleure expérience client.
      </p>
      
      <h3 className="text-2xl font-semibold text-foreground mt-8 mb-4">Notre Magasin à Paris</h3>
      <p>
        Venez nous rendre visite dans notre boutique située au cœur de Paris. Notre équipe de conseillers experts vous accueille du lundi au samedi pour vous aider à trouver les <strong>produits de papeterie</strong> adaptés à vos besoins. Vous pourrez découvrir nos collections, toucher la qualité de nos produits et bénéficier de conseils personnalisés.
      </p>
      
      <h3 className="text-2xl font-semibold text-foreground mt-8 mb-4">Service Client Réactif</h3>
      <p>
        Notre <strong>service client</strong> est disponible par téléphone, email, chat en ligne et WhatsApp. Que vous ayez une question sur un produit, besoin d'aide pour passer commande, ou un problème avec une livraison, nous nous engageons à vous répondre rapidement et efficacement.
      </p>
      
      <h3 className="text-2xl font-semibold text-foreground mt-8 mb-4">Demandes Professionnelles et Partenariats</h3>
      <p>
        Entreprises, associations, établissements scolaires : contactez notre service B2B pour obtenir un <strong>devis personnalisé</strong>, discuter d'un <strong>partenariat</strong> ou mettre en place une solution de <strong>commande récurrente</strong>. Nous étudions chaque demande avec attention pour vous proposer l'offre la plus adaptée.
      </p>
    </SeoSection>
  );
};