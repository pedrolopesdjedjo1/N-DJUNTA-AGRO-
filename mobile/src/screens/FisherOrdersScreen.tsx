import React from "react";
import { FisherLayout } from "../components/MerchantTabs";
import SellerOrders from "../components/SellerOrders";

export default function FisherOrdersScreen({ navigation }: any) {
  // O botão "Pedir transporte" abre o transporte do pescador
  const nav = {
    ...navigation,
    navigate: (name: string, params?: any) =>
      navigation.navigate(name === "MerchantDeliveries" ? "FisherTransport" : name, params),
  };

  return (
    <FisherLayout active="FisherSell">
      <SellerOrders variant="merchant" navigation={nav} />
    </FisherLayout>
  );
}
