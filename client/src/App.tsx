import { Button, Card, CardBody, Input, Spinner } from "reactstrap";
import { useEffect, useState } from "react";
import { faker } from "@faker-js/faker";
import { useSqlLiteProvider } from "./sqlite/useSqlLite";
import _ from "lodash";

import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import {
  compileRows,
  convertRowToObject,
  convertToObjects,
  mergeRows,
} from "./sqlite/helper";
import { Product, Store } from "./models/Product";

function App() {
  const { query, each, insert, persistDatabase, downloadDatabase } =
    useSqlLiteProvider();
  const [value, setValue] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [limit, setLimit] = useState(30);

  const createProductsTable = async () => {
    await query(
      `
        CREATE TABLE Stores(
          [Id] INTEGER PRIMARY KEY AUTOINCREMENT,
          [Company] TEXT NOT NULL,
          [Address] TEXT NOT NULL
        ) STRICT;
        
        CREATE TABLE Products(
          [Id] INTEGER PRIMARY KEY AUTOINCREMENT, 
          [Name] TEXT NOT NULL, 
          [Description] TEXT NOT NULL DEFAULT '',
          [StoreId] INTEGER NOT NULL,
          FOREIGN KEY ([StoreId]) REFERENCES Stores(Id)
        ) STRICT;
      `
    );
    persistDatabase();
  };

  const insertStores = async () => {
    const company = faker.company.name();
    const address = faker.address.street();

    await insert(
      `
        INSERT INTO Stores([Company], [Address]) VALUES($company, $address)
      `,
      {
        $company: company,
        $address: address,
      }
    );
    persistDatabase();
    refresh();
  };

  const insertProduct = async () => {
    const productName = faker.commerce.product();
    const productDescription = faker.commerce.productDescription();

    const storeIds: number[] = [];
    await each(
      `
        SELECT *
        FROM Stores
      `,
      (row: any) => {
        const store = convertRowToObject<Store>(row);
        storeIds.push(store.id);
      }
    );

    await insert(
      `
        INSERT INTO Products([Name], [Description], [StoreId]) VALUES($name, $description, $storeId)
      `,
      {
        $name: productName,
        $description: productDescription,
        $storeId: faker.helpers.arrayElement(storeIds),
      }
    );
    persistDatabase();
    refresh();
  };

  const insertProductsAsync = async () => {
    setIsLoading(true);

    const storeIds: number[] = [];
    await each(
      `
        SELECT *
        FROM Stores
      `,
      (row: any) => {
        const store = convertRowToObject<Store>(row);
        storeIds.push(store.id);
      }
    );

    for (let i = 0; i < 50000; i++) {
      const productName = faker.commerce.product();
      const productDescription = faker.commerce.productDescription();
      await query(
        `INSERT INTO Products([Name], [Description], [StoreId]) VALUES($name, $description, $storeId)`,
        {
          $name: productName,
          $description: productDescription,
          $storeId: faker.helpers.arrayElement(storeIds),
        }
      );
    }
    setIsLoading(false);
    persistDatabase();
    refresh();
  };

  const clear = async () => {
    await query(`DROP TABLE Products; DROP TABLE Stores;`);
    persistDatabase();
    refresh();
  };

  const refreshCount = async () => {
    let mergedRows: Record<string, any> = {};

    const { results } = await query(`SELECT COUNT(*) AS [Count] FROM Products`);
    const counts = results
      .map((x) => convertToObjects<{ count: number }>(x))
      .flat();
    setCount(counts[0].count);
  };

  const refreshData = async () => {
    const mergedRows: Record<number, any> = {};
    await each(
      `
      SELECT P.*, S.Id as [Store_Id], S.Company as [Store_Company], S.Address as [Store_Address] 
      FROM Products AS P
      LEFT JOIN Stores AS S ON S.Id = P.StoreId
      WHERE [Name] LIKE '%'|| $search ||'%' OR [Description] LIKE '%' || $search || '%'
      ORDER BY Id desc
      LIMIT $limit
      `,
      (row) => {
        const productRow = convertRowToObject(row);
        mergeRows(mergedRows, productRow);
      },
      { $search: value, $limit: limit }
    );

    const products: any[] = [
      ...compileRows(
        mergedRows,
        () =>
          ({
            id: -1,
            description: "",
            name: "",
            store: {
              id: -1,
              address: "",
              company: "",
            },
          } as Product)
      ),
    ];

    setProducts(products);
  };

  const refresh = () => {
    refreshData();
    refreshCount();
  };

  useEffect(() => {
    refresh();
  }, [value, limit]);

  return (
    <section className="mt-5 flex-column d-flex align-items-center justify-content-between">
      <div>
        <Button className="me-2" onClick={clear} color="primary">
          Clear
        </Button>
        <Button className="me-2" onClick={createProductsTable} color="primary">
          Create Product Table
        </Button>
        <Button
          className="me-2"
          onClick={() => insertProductsAsync()}
          color="primary"
        >
          Insert Products
        </Button>
        <Button className="me-2" onClick={insertProduct} color="primary">
          Insert Product
        </Button>
        <Button className="me-2" onClick={insertStores} color="primary">
          Insert Store
        </Button>
        <Button className="me-2" onClick={refresh} color="primary">
          Refresh Data
        </Button>
        <Button className="me-2" onClick={downloadDatabase} color="primary">
          Export
        </Button>
      </div>
      <div className="text-center mt-4 w-75">
        <div className="d-flex justify-content-between my-2">
          <h3>Products</h3>
          <div>
            <b>Count: </b> {Math.min(limit, count)} / <span>{count}</span>
            {isLoading && <Spinner />}
          </div>
        </div>
        <div className="d-flex justify-content-between my-3">
          <Input
            className="w-50"
            type="text"
            placeholder="Search..."
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <Input
            className="w-25"
            type="number"
            placeholder="Limit..."
            value={limit}
            onChange={(event) => setLimit(+event.target.value)}
          />
        </div>
        {products.map((product) => (
          <Card className="mb-2" style={{ cursor: "pointer" }} key={product.id}>
            <CardBody>
              <div>
                <div>
                  <b>Id</b>: <span>{product.id}</span>
                </div>
                <div>
                  <b>Name</b>: <span>{product.name}</span>
                </div>
                <div>
                  <b>Description</b>: <span>{product.description}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default App;
