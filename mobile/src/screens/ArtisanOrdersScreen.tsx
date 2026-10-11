import React from "react";
import { ArtisanLayout } from "../components/MerchantTabs";
import SellerOrders from "../components/SellerOrders";

export default function ArtisanOrdersScreen({ navigation }: any) {
  return (
    <ArtisanLayout active="ArtisanOrders">
      <SellerOrders variant="artisan" navigation={navigation} />
    </ArtisanLayout>
  );
}
