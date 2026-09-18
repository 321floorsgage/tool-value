import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProductImage } from "../components/ProductImage";

const props = {
  src: "https://images.example.com/milwaukee-2904-20.jpg",
  alt: "Milwaukee Tool 2904-20 — M18 FUEL 1/2 in. Hammer Drill/Driver",
  brand: "Milwaukee Tool",
  modelNumber: "2904-20",
  sourceUrl: "https://example.com/products/2904-20",
};

describe("ProductImage", () => {
  it("renders one image with the catalog's alt text and no layout shift", () => {
    render(<ProductImage {...props} />);
    const img = screen.getByRole("img", { name: props.alt });
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(img).toHaveAttribute("src", props.src);
    expect(img).toHaveAttribute("width", "800");
    expect(img).toHaveAttribute("height", "800");
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("decoding", "async");
    expect(img.className).toContain("object-contain");
  });

  it("falls back to a model-specific alt when the catalog has none", () => {
    render(<ProductImage {...props} alt={null} />);
    expect(screen.getByRole("img", { name: "Milwaukee Tool 2904-20 product image" })).toBeInTheDocument();
  });

  it("shows an accessible placeholder when there is no image", () => {
    render(<ProductImage {...props} src={null} alt={null} />);
    expect(screen.getByRole("img", { name: "Milwaukee Tool 2904-20: image unavailable" })).toBeInTheDocument();
    expect(screen.getByText("Image unavailable")).toBeInTheDocument();
    expect(screen.getByText("2904-20")).toBeInTheDocument();
    expect(screen.queryByTestId("product-image-img")).not.toBeInTheDocument();
  });

  it("swaps to the placeholder when the image fails to load", () => {
    render(<ProductImage {...props} />);
    fireEvent.error(screen.getByTestId("product-image-img"));
    expect(screen.queryByTestId("product-image-img")).not.toBeInTheDocument();
    expect(screen.getByTestId("product-image-placeholder")).toBeInTheDocument();
  });

  it("retries after a failure when the model changes", () => {
    const { rerender } = render(<ProductImage {...props} />);
    fireEvent.error(screen.getByTestId("product-image-img"));
    expect(screen.getByTestId("product-image-placeholder")).toBeInTheDocument();
    rerender(<ProductImage {...props} src="https://images.example.com/dewalt-dcn680b.jpg" modelNumber="DCN680B" />);
    expect(screen.getByTestId("product-image-img")).toHaveAttribute("src", "https://images.example.com/dewalt-dcn680b.jpg");
  });

  it("links to the image source safely, and only with a URL", () => {
    render(<ProductImage {...props} />);
    const link = screen.getByRole("link", { name: /View image source/ });
    expect(link).toHaveAttribute("href", props.sourceUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("omits the source link when the catalog has none", () => {
    render(<ProductImage {...props} sourceUrl={null} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
