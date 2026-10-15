import React from "react";
import { FarmerLayout } from "../components/MerchantTabs";
import SellerOrders from "../components/SellerOrders";

export default function FarmerOrdersScreen({ navigation }: any) {
  // O botão "Pedir transporte" do componente de pedidos abre o transporte do agricultor
  const nav = {
    ...navigation,
    navigate: (name: string, params?: any) =>
      navigation.navigate(name === "MerchantDeliveries" ? "FarmerTransport" : name, params),
  };

  return (
    <FarmerLayout active="FarmerOrders">
      <SellerOrders variant="merchant" navigation={nav} />
    </FarmerLayout>
  );
}
