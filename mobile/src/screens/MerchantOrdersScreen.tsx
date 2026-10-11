import React from "react";
import { MerchantLayout } from "../components/MerchantTabs";
import SellerOrders from "../components/SellerOrders";

export default function MerchantOrdersScreen({ navigation }: any) {
  return (
    <MerchantLayout active="MerchantOrders">
      <SellerOrders variant="merchant" navigation={navigation} />
    </MerchantLayout>
  );
}
